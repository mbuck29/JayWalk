/**
 * File: index.tsx
 * Purpose: The home menu for the app; used for searhcing for locations and starting routes
 * Author: Michael B, C. Cooper, Cole C, Delaney G.
 * Date Created: 2026-02-03
 * Date Modified: 2026-02-28
 */

import LocationMenu from "@/components/ui/LocationMenu";
import { graph, Node } from "@/maps/graph";

import {
  clearRoute,
  setAccessiblePreference,
  setIndoorOutdoorPreference,
  setRoute,
  useAppDispatch,
  useAppSelector,
} from "@/redux/appState";

import { useFonts } from "expo-font";
import * as Location from "expo-location";
import { navigate } from "expo-router/build/global-state/routing";
import { useEffect, useRef, useState } from "react";

import {
  Image,
  TextInput as RNTextInput,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  Button,
  Dialog,
  Menu,
  Text as PaperText,
  Portal,
  Snackbar,
  TextInput,
} from "react-native-paper";

import InfoIcon from "../../assets/images/icons/info.svg";
import TargetIcon from "../../assets/images/icons/target.svg";
import { watchLocation } from "../Utils/location";
import { route } from "../Utils/routing";
import { haversineMeters, sanitize } from "../Utils/routingUtils";
import { getState } from "../Utils/state";

export default function HomeScreen() {
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedEnvironment, setSelectedEnvironment] = useState<
    "outdoors" | "indoors" | "nopreference"
  >("nopreference");
  const accessible = useAppSelector((s) => s.jayWalk.accessible ?? false);

  const [currLocation, setCurrLocation] = useState<Node | null>(null);
  const [destLocation, setDestLocation] = useState<Node | null>(null);
  const [currLocationText, setCurrLocationText] = useState("");
  const [destLocationText, setDestLocationText] = useState("");
  const [showMissingLocation, setShowMissingLocation] = useState(false);
  const [showNeedLocationPermission, setShowNeedLocationPermission] =
    useState(false);
  const [showNotPerciseLocation, setShowNotPerciseLocation] = useState(false);
  const [showTooFarAway, setShowTooFarAway] = useState(false);
  const [isCurrentMenuVisible, setIsCurrentMenuVisible] = useState(false);
  const [isDestinationMenuVisible, setIsDestinationMenuVisible] =
    useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const destInputRef = useRef<RNTextInput | null>(null);
  const currLocInputRef = useRef<RNTextInput | null>(null);

  const [locationPermissionStatus, requestLocationPermissions] =
    Location.useForegroundPermissions();

  function hasLocationPermissions(): boolean {
    return locationPermissionStatus?.granted ?? false;
  }

  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );

  // read current values from Redux
  const indoors = useAppSelector((s) => s.jayWalk.indoors);
  useEffect(() => {
    console.log("[filters] accessible:", accessible, "indoors:", indoors);
  }, [accessible, indoors]);

  // This function handles making sure that the user has entered both a current
  // location and a destination before starting routing.
  const handleStartRoutingPress = () => {
    console.log("Start routing pressed.");
    if (currLocation && destLocation) {
      // Before we start routing we need to know from and to for the algo to work
      console.log(
        `Routing from ${currLocation.name} to ${destLocation.name}...`,
      );

      // Call the routing algorithm from the current to the destination nodes
      const calculatedRoute = route(state, currLocation, destLocation);

      // If there is no route, log it and return
      if (!calculatedRoute) {
        dispatch(clearRoute());
        console.log("No route found!");
        return;
      }

      // Sanitize the route and then push it to the global state
      dispatch(setRoute(sanitize(calculatedRoute)));

      // This will navigate them to the map screen where they can see the route we just calculated.
      navigate("/routing");
    } else {
      // If they dont provide both we will show a message telling them to provide both.
      setShowMissingLocation(true);
    }
  };

  // Get the user's permission to use their location
  useEffect(() => {
    if (!hasLocationPermissions()) {
      requestLocationPermissions();
    }

    // If we have location permissions, add a watcher for when they move
    if (hasLocationPermissions()) {
      watchLocation(setLocation, (errorReason) =>
        console.log("Location error: " + errorReason),
      );
    }
  }, [locationPermissionStatus]);

  const state = getState();
  const dispatch = useAppDispatch();

  const handleCurrentAreaPress = () => {
    if (!hasLocationPermissions()) {
      // If we dont have permission for distance we cant use this feature, so we tell the user that.
      setShowNeedLocationPermission(true);
      return;
    }
    // If they havent given us a location we cant do anything so we just return.
    // This also helps with typing the the const lines below as we know that location is not null.
    if (!location) return;

    // Get the accuracy and coordinates of the location. We will use these to determine whether we can snap to a node and which node to snap to.
    const gpsAcc = location.coords.accuracy ?? 9999;
    const userLat = location.coords.latitude;
    const userLon = location.coords.longitude;

    console.log(`Location accuracy: ${gpsAcc.toFixed(2)} m`);
    console.log(`Current location: ${userLat}, ${userLon}`);

    // Initalize closestNode to null, we will use it to keep track of the closesnt node to the user as we loop through the nodes.
    let closestNode: { node: any; distanceM: number } | null = null;

    for (const node of graph.nodes) {
      // Calculate distance from user to node in meters using the haversine formula
      const dM = haversineMeters(userLat, userLon, node.y, node.x);

      // If there isnt a closest node or its closer than the current closest node, then set it as the closest node
      if (!closestNode || dM < closestNode.distanceM) {
        closestNode = { node, distanceM: dM };
      }
    }

    // This covers the case where for some reason our graph has no nodes, it also helps with typing below.
    if (!closestNode) return;

    console.log(
      `Closest node: ${closestNode.node.name} (id: ${closestNode.node.id}), distance: ${closestNode.distanceM.toFixed(1)} m`,
    );

    const MAX_ACCEPTABLE_ACC = 25; // don’t trust worse than this
    const snapThresholdM = Math.max(10, gpsAcc * 1.5); // dynamic threshold

    // In the case that the GPS accuracy is really bad, we dont want to use that as the starting location as it is most likely not
    // correct so we tell the user that and return/
    if (gpsAcc > MAX_ACCEPTABLE_ACC) {
      console.log(`GPS too noisy to snap (acc=${gpsAcc.toFixed(1)}m).`);
      setShowNotPerciseLocation(true); // Let the user know that their location is not precise enough to use current location feature
      return;
    }

    // If the user is close enough to a node we will assume that that is there starting location and set that for them.
    if (closestNode.distanceM <= snapThresholdM) {
      console.log(
        `Snapping to node (threshold=${snapThresholdM.toFixed(1)}m).`,
      );
      // For now just setting it as the name, but I think we have nodes that the user shouldnt see the name so I
      // we will need to come up for what the UI looks like for that.
      setCurrLocationText(closestNode.node.name); // update text field to show assumed location
      setCurrLocation(closestNode.node);
    } else {
      // If the user isnt close enough to a node we dont want to use that node as there Location as this wouldnt be accurate.
      // So we tell the user that with a toast message.
      console.log(
        `Not near any node (closest=${closestNode.distanceM.toFixed(1)}m, threshold=${snapThresholdM.toFixed(1)}m).`,
      );
      setShowTooFarAway(true);
    }
  };
  //get fonts files from utils
  const [fontsLoaded] = useFonts({
    "MuseoModerno-Regular": require("../../assets/fonts/MuseoModerno.ttf"),
    "MuseoModerno-Bold": require("../../assets/fonts/MuseoModerno-Bold.ttf"),
    OrelegaOne: require("../../assets/fonts/OrelegaOne-Regular.ttf"),
  });

  if (!fontsLoaded) {
    return null;
  }
  //Title
  return (
    <View style={styles.background}>
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={styles.appTitle}>JayWalk</Text>
          <InfoIcon
            width={24}
            height={24}
            color="#fff"
            style={{ marginLeft: 8 }}
          />
        </View>
      </View>

      {/* campanile logo */}
      <Image
        source={require("../../assets/images/JayWalk-Logo1.png")}
        style={styles.heroImage}
        resizeMode="cover"
      />

      {/* background and white box with text  */}
      <View style={styles.whiteBox}>
        <View style={styles.content}>
          {/* Current Location label */}
          <View
            style={{
              position: "absolute",
              top: 160,
              width: 316,
              height: 70,
              left: "50%",
              transform: [{ translateX: -159 }],
            }}
          >
            <Text style={[styles.subtitle, { marginBottom: 8 }]}>
              Current Location:
            </Text>
            {/* Text input with LocationMenu */}
            {/* When the user looks for a location we populate and display a 
                menu of locations for them to select. Making it easier to find there
                locaiton.*/}
            <LocationMenu
              visible={isCurrentMenuVisible} // We only want to show the menu
              //when the user is actively using the text field
              onDismiss={() => setIsCurrentMenuVisible(false)}
              oppisiteValue={destLocation}
              anchor={
                // The location menu needs something to anchor it, so that it knows where to appear. In this case we anchor it to the text input for the current location.
                //current location box
                <TextInput
                  ref={currLocInputRef}
                  value={currLocationText}
                  activeUnderlineColor="transparent"
                  underlineColor="transparent"
                  textColor="#356EC4"
                  mode="outlined"
                  theme={{ roundness: 44 }}
                  outlineColor="transparent"
                  onChangeText={setCurrLocationText}
                  style={{
                    backgroundColor: "#C2DCF0",
                    borderRadius: 44,
                    borderTopEndRadius: 44,
                    borderTopStartRadius: 44,
                    height: 68,
                    width: 316,
                    paddingHorizontal: 16,
                    justifyContent: "center",
                    fontSize: 18,
                  }}
                  contentStyle={{
                    fontFamily: "OrelegaOne",
                  }}
                  onFocus={() => setIsCurrentMenuVisible(true)} // When the user focuses on the text input we want to show the menu so that they can select there location from the list of options.
                  onChange={() => setIsCurrentMenuVisible(true)}
                />
              }
              options={graph.nodes} // They are selecting from the nodes so we pass them here
              // We pass the current text in the text field to the menu so that it can filter the options based on what the user has typed.
              // This makes it easier for the user to find there location. We also pass the set function so when they select something we can set it as there choice
              locationText={currLocationText}
              setLocation={setCurrLocation}
              setLocationText={setCurrLocationText}
              onSelect={() => currLocInputRef.current?.blur()}
            />
          </View>

          {/* Destination label and box*/}
          <View
            style={{
              position: "absolute",
              top: 265,
              left: "50%",
              transform: [{ translateX: -158 }],
              width: 316,
              height: 68,
            }}
          >
            <Text style={[styles.subtitle, { marginBottom: 8 }]}>
              Destination:
            </Text>

            <LocationMenu
              visible={isDestinationMenuVisible}
              onDismiss={() => setIsDestinationMenuVisible(false)}
              oppisiteValue={currLocation}
              anchor={
                <TextInput
                  ref={destInputRef}
                  value={destLocationText}
                  activeUnderlineColor="transparent"
                  activeOutlineColor="#356EC4"
                  underlineColor="transparent"
                  textColor="#356EC4"
                  mode="outlined"
                  theme={{ roundness: 44 }}
                  outlineColor="transparent"
                  onChangeText={setDestLocationText}
                  style={{
                    backgroundColor: "#C2DCF0",
                    borderRadius: 44,
                    borderTopEndRadius: 44,
                    borderTopStartRadius: 44,
                    height: 68,
                    width: 316,
                    paddingHorizontal: 16,
                    justifyContent: "center",
                    fontSize: 18,
                  }}
                  contentStyle={{
                    fontFamily: "OrelegaOne",
                  }}
                  onFocus={() => setIsDestinationMenuVisible(true)}
                  onChange={() => setIsDestinationMenuVisible(true)}
                />
              }
              options={graph.nodes}
              locationText={destLocationText}
              setLocation={setDestLocation}
              setLocationText={setDestLocationText}
              onSelect={() => destInputRef.current?.blur()}
            />
          </View>

          {/* Accessible Path label */}
          <PaperText
            variant="titleMedium"
            style={{
              position: "absolute",
              top: 369,
              left: 36,
              fontFamily: "OrelegaOne",
              fontSize: 20,
              color: "#000",
            }}
          >
            Accessible:
          </PaperText>

          {/* container for toggle & environment button */}
          <View
            style={{
              position: "absolute",
              top: 370,
              left: 68,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",

              gap: 60, // space between toggle and button
            }}
          >
            {/* Accessible toggle */}

            <Switch
              value={accessible}
              onValueChange={(newValue: boolean) => {
                dispatch(setAccessiblePreference(newValue));
              }}
              trackColor={{
                false: "#0A2145",
                true: "#356EC4",
              }}
              thumbColor="#ffffff"
              ios_backgroundColor="#0A2145"
              style={{
                transform: [{ scaleX: 2.2 }, { scaleY: 2.2 }],
                marginTop: 51,
              }}
            />

            {/* Environment dropdown + label container */}
            <View style={{ flexDirection: "column" }}>
              {/* Environment label */}
              <PaperText
                variant="titleMedium"
                style={{
                  fontFamily: "OrelegaOne",
                  fontSize: 20,
                  color: "#000",
                  marginBottom: 8,
                }}
              >
                Environment:
              </PaperText>

              {/* Environment button */}
              <Menu
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                anchor={
                  <Button
                    mode="contained"
                    onPress={() => setMenuVisible(true)}
                    style={{
                      width: 170,
                      backgroundColor: "#C2DCF0",
                      borderRadius: 44,
                    }}
                    contentStyle={{ height: 68 }}
                    labelStyle={{
                      color: "#356EC4",
                      fontSize: 18,
                      fontFamily: "OrelegaOne",
                    }}
                  >
                    {selectedEnvironment === "nopreference"
                      ? "Select Filter"
                      : selectedEnvironment.charAt(0).toUpperCase() +
                        selectedEnvironment.slice(1)}
                  </Button>
                }
              >
                <Menu.Item
                  onPress={() => {
                    setSelectedEnvironment("outdoors");
                    dispatch(setIndoorOutdoorPreference("outdoors"));
                    setMenuVisible(false);
                  }}
                  title="Outdoors"
                />
                <Menu.Item
                  onPress={() => {
                    setSelectedEnvironment("indoors");
                    dispatch(setIndoorOutdoorPreference("indoors"));
                    setMenuVisible(false);
                  }}
                  title="Indoors"
                />
                <Menu.Item
                  onPress={() => {
                    setSelectedEnvironment("nopreference");
                    dispatch(setIndoorOutdoorPreference(""));
                    setMenuVisible(false);
                  }}
                  title="No Preference"
                />
              </Menu>
            </View>
          </View>

          {/* LETS GO */}
          {/* This is the start route button, it will call our routing algorithm if has two valid locations*/}
          <Button
            mode="contained"
            style={{
              ...styles.button,
              position: "absolute",
              width: 288,
              borderRadius: 44,
              top: 485,
              alignSelf: "center",
            }}
            contentStyle={{
              justifyContent: "center",
              height: 69,
            }}
            labelStyle={{
              fontFamily: "OrelegaOne",
              fontSize: 20,
              color: "#fff",
            }}
            disabled={!(currLocationText && destLocationText)} // if they havent put in both locations
            onPress={handleStartRoutingPress}
          >
            LET'S GO!
          </Button>

          {/*get curr location*/}

          {/*This is the button that will allows the user to use the current location as the starting location*/}
          {/*TODO: Find a way to hide this for if a user is inside as we cannot use */}
          <TouchableOpacity
            style={styles.currAreaButton}
            onPress={handleCurrentAreaPress}
          >
            <TargetIcon width={24} height={24} color="#2e18be" />
          </TouchableOpacity>
        </View>
        {/* Small message to tell the user that they need to put both locations*/}
        <Snackbar
          visible={showMissingLocation} // The local state that controls whether this snackbar is visible or not
          onDismiss={() => setShowMissingLocation(false)} // When the snackbar is dismissed we set the state to false so that it hides
          duration={2000} // This makes the snackbar go away after 2 seconds
        >
          You need to enter both your currenet location and destination to start
          routing.
        </Snackbar>
        {/* This is a snackbar that is shown when the user tries to use current location but hasnt given location permissions. */}
        <Snackbar
          visible={showNeedLocationPermission}
          onDismiss={() => setShowNeedLocationPermission(false)}
          duration={2000}
        >
          You need to enable location permissions to use this feature.
        </Snackbar>
        {/* This is a snackbar that is shown when the user tries to use current location but their location is not precise enough. */}
        <Snackbar
          visible={showNotPerciseLocation}
          onDismiss={() => setShowNotPerciseLocation(false)}
          duration={2000}
        >
          Your location is not precise enough to start routing.
        </Snackbar>
        {/* This is a snackbar that is shown when the user tries to use current location but is to far away. */}
        <Snackbar
          visible={showTooFarAway}
          onDismiss={() => setShowTooFarAway(false)}
          duration={2000}
        >
          Your are not close enough to a starting location.
        </Snackbar>
      </View>

      {/* 
        Portal allows the Dialog to render above all other UI elements.
        This ensures the modal appears on top of the entire screen.
      */}
      <Portal>
        {/* 
          Dialog component from react-native-paper.
          - visible controls whether the dialog is shown.
          - onDismiss is called when the user taps outside the dialog or presses back.
        */}
        <Dialog
          visible={showInfo}
          onDismiss={() => setShowInfo(false)}
          style={{
            borderRadius: 28,
            backgroundColor: "#ffffff",
          }}
        >
          {/* Custom header */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 20,
              paddingTop: 10,
            }}
          >
            <Dialog.Title
              style={{
                fontFamily: "MuseoModerno-Bold",
                fontSize: 22,
                color: "#0A2145",
              }}
            >
              About JayWalk
            </Dialog.Title>

            <Image
              source={require("../../assets/images/JayWalk-Logo1.png")}
              style={{ width: 36, height: 36 }}
              resizeMode="contain"
            />
          </View>

          {/* Main body content of the dialog */}
          <Dialog.Content>
            {/* Introductory description of what the app does */}
            <PaperText style={styles.infoBodyText}>
              JayWalk helps you navigate between campus locations with indoor
              step-by-step directions and outdoor map routing.
            </PaperText>

            {/* Section header: Step 1 */}
            <PaperText style={styles.infoSectionTitle}>
              1) Choose your start & destination
            </PaperText>

            {/* Explanation of how to select starting location */}
            <PaperText style={styles.infoBodyText}>
              • Use the first search bar to pick your starting location.
            </PaperText>

            {/* Explanation of how to select destination */}
            <PaperText style={styles.infoBodyText}>
              • Use the second search bar to pick your destination.
            </PaperText>

            {/* Extra tip explaining the GPS shortcut button behavior */}
            <PaperText style={styles.infoBodyText}>
              Tip: Tap the target button in the first search bar to use your
              current GPS location as your starting point (outdoors only). If
              GPS accuracy is low or you’re too far from a known start point,
              JayWalk will ask you to choose manually.
            </PaperText>

            {/* Section header: Step 2 */}
            <PaperText style={styles.infoSectionTitle}>
              2) Set your preferences (optional)
            </PaperText>

            {/* Description of accessibility filter */}
            <PaperText style={styles.infoBodyText}>
              • Accessible: Specify whether the route should be accessible (when
              available).
            </PaperText>

            {/* Description of indoor/outdoor environment filter */}
            <PaperText style={styles.infoBodyText}>
              • Environment: Choose if you want your route to prefer indoor
              paths, outdoor paths, or if you don’t care.
            </PaperText>

            {/* Section header: Step 3 */}
            <PaperText style={styles.infoSectionTitle}>
              3) Preview your route
            </PaperText>

            {/* Explanation of what happens after pressing "Let's Go!" */}
            <PaperText style={styles.infoBodyText}>
              Tap Let’s Go! to build a route and open the Route tab, where
              you’ll see a preview before starting.
            </PaperText>

            {/* Section header: Step 4 */}
            <PaperText style={styles.infoSectionTitle}>
              4) Start navigating
            </PaperText>

            {/* Explains how to begin active navigation */}
            <PaperText style={styles.infoBodyText}>
              • Tap Start Route to begin.
            </PaperText>

            {/* Indoor navigation instructions */}
            <PaperText style={styles.infoBodyText}>
              • When indoors, directions appear as sequential steps and you use
              Previous/Next buttons to navigate through them.
            </PaperText>

            {/* Indoor floor plan feature explanation */}
            <PaperText style={styles.infoBodyText}>
              Tip: While indoors, you can also open the a floor plan of the
              building at any time.
            </PaperText>

            {/* Map recenter explanation when user pans away */}
            <PaperText style={styles.infoBodyText}>
              If you pan around the map, use the target button to jump back to
              your position.
            </PaperText>

            {/* Section header: Ending navigation */}
            <PaperText style={styles.infoSectionTitle}>Ending early</PaperText>

            {/* Explains how to cancel an active route */}
            <PaperText style={styles.infoBodyText}>
              You can stop navigation anytime by tapping End Route.
            </PaperText>
          </Dialog.Content>

          {/* Action buttons shown at the bottom of the dialog */}
          <Dialog.Actions style={{ padding: 16 }}>
            <Button
              mode="contained"
              onPress={() => setShowInfo(false)}
              style={{
                backgroundColor: "#356EC4",
                borderRadius: 44,
                paddingHorizontal: 16,
              }}
              labelStyle={{
                fontFamily: "OrelegaOne",
                fontSize: 16,
                color: "#fff",
              }}
            >
              Close
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Small message to tell the user that they need to put both locations*/}
      <Snackbar
        visible={showMissingLocation} // The local state that controls whether this snackbar is visible or not
        onDismiss={() => setShowMissingLocation(false)} // When the snackbar is dismissed we set the state to false so that it hides
        duration={2000} // This makes the snackbar go away after 2 seconds
      >
        You need to enter both your currenet location and destination to start
        routing.
      </Snackbar>
      {/* This is a snackbar that is shown when the user tries to use current location but hasnt given location permissions. */}
      <Snackbar
        visible={showNeedLocationPermission}
        onDismiss={() => setShowNeedLocationPermission(false)}
        duration={2000}
      >
        You need to enable location permissions to use this feature.
      </Snackbar>
      {/* This is a snackbar that is shown when the user tries to use current location but their location is not precise enough. */}
      <Snackbar
        visible={showNotPerciseLocation}
        onDismiss={() => setShowNotPerciseLocation(false)}
        duration={2000}
      >
        Your location is not precise enough to start routing.
      </Snackbar>
      {/* This is a snackbar that is shown when the user tries to use current location but is to far away. */}
      <Snackbar
        visible={showTooFarAway}
        onDismiss={() => setShowTooFarAway(false)}
        duration={2000}
      >
        Your are not close enough to a starting location.
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    gap: 8,
    backgroundColor: "#0A2145",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    backgroundColor: "#0A2145",
    paddingHorizontal: 30,
    paddingBottom: 10,
    height: 90,
  },
  appTitle: {
    color: "#fff",
    fontSize: 24,
    fontFamily: "MuseoModerno-Bold",
  },

  heroImage: {
    position: "absolute",
    top: 96,
    left: 94,
    right: 0,
    height: 240,
    width: 211,
    zIndex: 1,
  },
  whiteBox: {
    position: "absolute",
    top: 177,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
    padding: 16,
  },
  content: {},
  currAreaButton: {
    position: "absolute",
    top: 202,
    right: 47,
    backgroundColor: "#356EC4",
    borderRadius: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  button: {
    marginTop: 16,
    color: "#fff",
    fontFamily: "OrelagaOne",
    backgroundColor: "#356EC4",
    borderRadius: 8,
    width: 120,
  },
  title: { fontSize: 22, fontWeight: "bold", color: "#E8000d" },
  textField: {
    width: 200,
    backgroundColor: "transparent",
  },
  subtitle: {
    fontSize: 20,
    color: "#000000",
    fontFamily: "OrelegaOne",
  },
  infoBodyText: {
    fontFamily: "OrelegaOne",
    fontSize: 15,
    color: "#0A2145",
    marginBottom: 6,
  },
  infoSectionTitle: {
    fontFamily: "OrelegaOne",
    fontSize: 18,
    color: "#356EC4",
    marginTop: 14,
    marginBottom: 6,
  },
});
