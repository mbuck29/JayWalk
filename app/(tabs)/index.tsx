import LocationMenu from "@/components/ui/LocationMenu";
import { graph } from "@/maps/graph";
import { clearRoute, setRoute, useAppDispatch, useAppSelector, setAccessiblePreference, setIndoorOutdoorPreference } from "@/redux/appState";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Button, Snackbar, TextInput, Checkbox, RadioButton } from "react-native-paper";
import InfoIcon from "../../assets/images/icons/info.svg";
import TargetIcon from "../../assets/images/icons/target.svg";
import { watchLocation } from "../Utils/location";
import { route } from "../Utils/routing";
import { haversineMeters, sanitize } from "../Utils/routingUtils";
import { getRoute, getState } from "../Utils/state";

export default function HomeScreen() {
  // const motion = useOrientation();
  // const alpha = motion?.rotation?.alpha ?? 0;
  // const beta = motion?.rotation?.beta ?? 0;
  // const gamma = motion?.rotation?.gamma ?? 0;
  // const [heading, setHeading] = useState(0); // 0..360
  // const headingRef = useRef(0);
  const [currLocationText, setcurrLocationText] = useState("");
  const [destLocationText, setDestLocationText] = useState("");
  const [showMissingLocation, setShowMissingLocation] = useState(false);
  const [showNeedLocationPermission, setShowNeedLocationPermission] =
    useState(false);
  const [showNotPerciseLocation, setShowNotPerciseLocation] = useState(false);
  const [showTooFarAway, setShowTooFarAway] = useState(false);
  const [isCurrentMenuVisible, setIsCurrentMenuVisible] = useState(false);
  const [isDestinationMenuVisible, setIsDestinationMenuVisible] =
    useState(false);

  const options = ["Engineering", "Union", "Memorial Stadium"];

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


  // TODO: Once we have the actual routing we will need to call it here
  // TODO: We will need to add a check that makes sure that the user put in valid locations
  // This function handles making sure that the user has entered both a current
  // location and a destination before starting routing.
  const handleStartRoutingPress = () => {
    if (currLocationText && destLocationText) {
      console.log(`Routing from ${currLocationText} to ${destLocationText}...`);
    } else {
      setShowMissingLocation(true);
    }
  };

  useEffect(() => {
    if (!hasLocationPermissions()) {
      requestLocationPermissions();
    }

    if (hasLocationPermissions()) {
      watchLocation(setLocation, (errorReason) =>
        console.log("Location error: " + errorReason),
      );
    }
  }, [locationPermissionStatus]);

  const state = getState();
  const dispatch = useAppDispatch();
  const currentRoute = getRoute(state);

  const start = 6;
  const end = 14;

  useEffect(() => {
    if (
      !currentRoute ||
      currentRoute.stops[0] != graph.nodes[start] ||
      currentRoute.stops[currentRoute.stops.length - 1] != graph.nodes[end]
    ) {
      const newRoute = route(state, graph.nodes[start], graph.nodes[end]);

      if (newRoute == null) {
        dispatch(clearRoute());
      } else {
        dispatch(setRoute(sanitize(newRoute)));
      }
    }
  }, []);

  const handleCurrentAreaPress = () => {
    if (!hasLocationPermissions()) {
      // If we dont have permission for distance we cant use this feature, so we tell the user that.
      setShowNeedLocationPermission(true);
      return;
    }
    if (!location) return;

    const gpsAcc = location.coords.accuracy ?? 9999;
    const userLat = location.coords.latitude;
    const userLon = location.coords.longitude;

    console.log(`Location accuracy: ${gpsAcc.toFixed(2)} m`);
    console.log(`Current location: ${userLat}, ${userLon}`);

    let closestNode: { node: any; distanceM: number } | null = null;

    for (const node of graph.nodes) {
      // Calculate distance from user to node in meters using the haversine formula
      const dM = haversineMeters(userLat, userLon, node.y, node.x);

      // If there isnt a closest node or its closer than the current closest node, then set it as the closest node
      if (!closestNode || dM < closestNode.distanceM) {
        closestNode = { node, distanceM: dM };
      }
    }

    if (!closestNode) return;

    console.log(
      `Closest node: ${closestNode.node.name} (id: ${closestNode.node.id}), distance: ${closestNode.distanceM.toFixed(1)} m`,
    );

    const MAX_ACCEPTABLE_ACC = 25; // don’t trust worse than this
    const snapThresholdM = Math.max(10, gpsAcc * 1.5); // dynamic threshold

    if (gpsAcc > MAX_ACCEPTABLE_ACC) {
      console.log(`GPS too noisy to snap (acc=${gpsAcc.toFixed(1)}m).`);
      setShowNotPerciseLocation(true); // Let the user know that their location is not precise enough to use current location feature
      return;
    }

    if (closestNode.distanceM <= snapThresholdM) {
      console.log(
        `Snapping to node (threshold=${snapThresholdM.toFixed(1)}m).`,
      );
      // For now just setting it as the name, but I think we have nodes that the user shouldnt see the name so I
      // we will need to come up for what the UI looks like for that.
      setcurrLocationText(closestNode.node.name); // update text field to show assumed location
    } else {
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
        {/* <Text> Orientation: {alpha.toFixed(2)}, {beta.toFixed(2)}, {gamma.toFixed(2)} </Text> */}
        <Text>
          Location: {location?.coords.latitude.toFixed(7) ?? "???"},{" "}
          {location?.coords.longitude.toFixed(7) ?? "???"}
        </Text>
        <Text style={styles.title}>Going Somewhere?</Text>
        <Text style={styles.subtitle}>Where I am:</Text>
        <LocationMenu
          visible={isCurrentMenuVisible}
          onDismiss={() => setIsCurrentMenuVisible(false)}
          anchor={
            <TextInput
              label="Current location"
              value={currLocationText}
              onChangeText={setcurrLocationText}
              mode="flat"
              activeUnderlineColor="#0015ba"
              textColor="#000"
              underlineColor="#000"
              placeholderTextColor="#000"
              style={styles.textField}
              onFocus={() => setIsCurrentMenuVisible(true)}
            />
          }
          options={graph.nodes.map((n) => n.name)}
          locationText={currLocationText}
          setLocationText={setcurrLocationText}
        />
        <Text style={styles.subtitle}>Where I want to go:</Text>
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
          options={graph.nodes.map((n) => n.name)}
          locationText={destLocationText}
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


        <Button
          mode="contained"
          style={styles.button}
          disabled={false} // will be if they havent put in both locations
          onPress={handleStartRoutingPress}
        >
          Let's Go!
        </Button>
        <TouchableOpacity
          style={styles.currAreaButton}
          onPress={handleCurrentAreaPress}
        >
          <TargetIcon width={24} height={24} color="#2e18be" />
        </TouchableOpacity>

        {/* <View style={styles.compass}>
           Arrow 
          <Animated.View style={[styles.arrowWrap, rotateStyle]}>
            <View style={styles.arrow} />
            <View style={styles.arrowTail} />
          </Animated.View>
        </View> */}
      </View>
      {/* Small message to tell the user that they need to put both locations*/}
      <Snackbar
        visible={showMissingLocation}
        onDismiss={() => setShowMissingLocation(false)}
        duration={2000}
      >
        You need to enter both your currenet location and destination to start
        routing.
      </Snackbar>
      <Snackbar
        visible={showNeedLocationPermission}
        onDismiss={() => setShowNeedLocationPermission(false)}
        duration={2000}
      >
        You need to enable location permissions to use this feature.
      </Snackbar>
      <Snackbar
        visible={showNotPerciseLocation}
        onDismiss={() => setShowNotPerciseLocation(false)}
        duration={2000}
      >
        Your location is not precise enough to start routing.
      </Snackbar>
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
  // compass: {
  //   marginTop: 24,
  //   width: 240,
  //   height: 240,
  //   alignItems: "center",
  //   justifyContent: "center",
  // },
  // arrowWrap: {
  //   width: 140,
  //   height: 140,
  //   alignItems: "center",
  //   justifyContent: "center",
  // },
  // arrow: {
  //   width: 0,
  //   height: 0,
  //   borderLeftWidth: 14,
  //   borderRightWidth: 14,
  //   borderBottomWidth: 40,
  //   borderLeftColor: "transparent",
  //   borderRightColor: "transparent",
  //   borderBottomColor: "white",
  //   position: "absolute",
  //   top: 10,
  // },
  // arrowTail: {
  //   width: 6,
  //   height: 60,
  //   backgroundColor: "white",
  //   borderRadius: 3,
  //   position: "absolute",
  //   top: 50,
  // },
});
