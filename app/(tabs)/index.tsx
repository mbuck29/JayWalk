/**
 * File: index.tsx
 * Purpose: The home menu for the app; used for searhcing for locations and starting routes
 * Author: Michael B, C. Cooper, Cole C
 * Date Created: 2026-02-03
 * Date Modified: 2026-02-15
 */

import LocationMenu from "@/components/ui/LocationMenu";
import { graph, Node } from "@/maps/graph";
import { clearRoute, setAccessiblePreference, setIndoorOutdoorPreference, setRoute, useAppDispatch, useAppSelector } from "@/redux/appState";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Button, Checkbox, RadioButton, Snackbar, TextInput } from "react-native-paper";
import InfoIcon from "../../assets/images/icons/info.svg";
import TargetIcon from "../../assets/images/icons/target.svg";
import { watchLocation } from "../Utils/location";
import { route } from "../Utils/routing";
import { haversineMeters, sanitize } from "../Utils/routingUtils";
import { getState } from "../Utils/state";

export default function HomeScreen() {
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

  const [locationPermissionStatus, requestLocationPermissions] =
    Location.useForegroundPermissions();

  function hasLocationPermissions(): boolean {
    return locationPermissionStatus?.granted ?? false;
  }

  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );

  // read current values from Redux
  const accessible = useAppSelector((s) => s.jayWalk.accessible);
  const indoors = useAppSelector((s) => s.jayWalk.indoors);
  useEffect(() => {
  console.log("[filters] accessible:", accessible, "indoors:", indoors);
}, [accessible, indoors]);


  const [accessibility, setAccessibility] = useState(false);
  const [environment, setEnvironment] = useState<
  "outdoors" | "indoors" | "dontcare"
>("dontcare");


  // This function handles making sure that the user has entered both a current
  // location and a destination before starting routing.
  const handleStartRoutingPress = () => {
    if (currLocation && destLocation) {
      // Before we start routing we need to know from and to for the algo to work
      console.log(`Routing from ${currLocation.name} to ${destLocation.name}...`);

      // Call the routing algorithm from the current to the destination nodes
      const calculatedRoute = route(state, currLocation, destLocation);

      // If there is no route, log it and return
      if(!calculatedRoute)
      {
        dispatch(clearRoute());
        console.log("No route found!");
        return;
      }

      // Sanitize the route and then push it to the global state
      dispatch(setRoute(sanitize(calculatedRoute)));

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
    } else {
      // If the user isnt close enough to a node we dont want to use that node as there Location as this wouldnt be accurate.
      // So we tell the user that with a toast message.
      console.log(
        `Not near any node (closest=${closestNode.distanceM.toFixed(1)}m, threshold=${snapThresholdM.toFixed(1)}m).`,
      );
      setShowTooFarAway(true);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.appTitle}>JayWalk</Text>
        {/* TODO: Makes this clickable that shows a dialog explaining the app*/}
        <InfoIcon width={24} height={24} color="#fff" />
      </View>
      <View style={styles.content}>
        <Text>
          Location: {location?.coords.latitude.toFixed(7) ?? "???"},{" "}
          {location?.coords.longitude.toFixed(7) ?? "???"}
        </Text>
        <Text style={styles.title}>Going Somewhere?</Text>
        <Text style={styles.subtitle}>Where I am:</Text>
        {/* When the user looks for a location we populate and display a menu of locations for them to select. Making it easier to find there locaiton.*/}
        <LocationMenu
          visible={isCurrentMenuVisible} // We only want to show the menu when the user is actively using the text field
          onDismiss={() => setIsCurrentMenuVisible(false)}
          anchor={
            // The location menu needs something to anchor it, so that it knows where to appear. In this case we anchor it to the text input for the current location.
            <TextInput
              label="Current location"
              value={currLocationText}
              onChangeText={setCurrLocationText}
              mode="flat" // This makes the text input have an underline instead of an outline, I think it looks better for this use case
              activeUnderlineColor="#0015ba"
              textColor="#000"
              underlineColor="#000"
              placeholderTextColor="#000"
              style={styles.textField}
              onFocus={() => setIsCurrentMenuVisible(true)} // When the user focuses on the text input we want to show the menu so that they can select there location from the list of options.
            />
          }
          options={graph.nodes} // They are selecting from the nodes so we pass them here
          // We pass the current text in the text field to the menu so that it can filter the options based on what the user has typed.
          // This makes it easier for the user to find there location. We also pass the set function so when they select something we can set it as there choice
          locationText={currLocationText}
          setLocation={setCurrLocation}
          setLocationText={setCurrLocationText}
        />
        <Text style={styles.subtitle}>Where I want to go:</Text>
        {/*This is the same thing as above just for the destination location*/}
        <LocationMenu
          visible={isDestinationMenuVisible}
          onDismiss={() => setIsDestinationMenuVisible(false)}
          anchor={
            <TextInput
              label="Destination location"
              value={destLocationText}
              onChangeText={setDestLocationText}
              mode="outlined"
              activeOutlineColor="#0015ba"
              style={styles.textField}
              onFocus={() => setIsDestinationMenuVisible(true)}
            />
          }
          options={graph.nodes}
          locationText={destLocationText}
          setLocation={setDestLocation}
          setLocationText={setDestLocationText}
        />

        <View style={{ padding: 16, gap: 8 }}>
          <Text variant="titleMedium">Filters</Text>

          <Checkbox.Item
            label="Accessible"
            status={accessible ? "checked" : "unchecked"}
            onPress={() => dispatch(setAccessiblePreference(!accessible))}
          />
        </View>

        <View style={{ paddingVertical: 12 }}>
          <Text variant="titleMedium">Environment</Text>

          <RadioButton.Group
            value={indoors === "" ? "dontcare" : indoors}
            onValueChange={(value) => {
              if (value === "dontcare") dispatch(setIndoorOutdoorPreference(""));
              else dispatch(setIndoorOutdoorPreference(value as "indoors" | "outdoors"));
            }}
          >
            <RadioButton.Item label="Outdoors" value="outdoors" />
            <RadioButton.Item label="Indoors" value="indoors" />
            <RadioButton.Item label="Don't Care" value="dontcare" />
          </RadioButton.Group>
        </View>


        {/* This is the start route button, it will call our routing algorithm if has two valid locations*/}
        <Button
          mode="contained"
          style={styles.button}
          disabled={!(currLocationText && destLocationText)} // if they havent put in both locations
          onPress={handleStartRoutingPress}
        >
          Let's Go!
        </Button>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 8,
    backgroundColor: "#fafafa",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    backgroundColor: "#0015BA",
    paddingHorizontal: 30,
    paddingBottom: 10,
    height: 90,
    width: 400,
  },
  appTitle: {
    color: "#fff",
    fontSize: 24,
  },
  content: {},
  currAreaButton: {
    position: "absolute",
    bottom: 16,
    right: 16,
    backgroundColor: "#E8000d",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  button: {
    marginTop: 16,
    color: "#fff",
    backgroundColor: "#E8000d",
    borderRadius: 8,
    width: 120,
  },
  title: { fontSize: 22, fontWeight: "bold", color: "#E8000d" },
  textField: {
    width: 200,
    backgroundColor: "transparent",
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 12,
    color: "#E8000d",
  },
});
