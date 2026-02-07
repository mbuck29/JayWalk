import LocationMenu from "@/components/ui/LocationMenu";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button, Snackbar, TextInput } from "react-native-paper";
import InfoIcon from "../../assets/images/icons/info.svg";
import { watchLocation } from "../Utils/location";

export default function HomeScreen() {
  // const motion = useOrientation();
  // const alpha = motion?.rotation?.alpha ?? 0;
  // const beta = motion?.rotation?.beta ?? 0;
  // const gamma = motion?.rotation?.gamma ?? 0;
  // const [heading, setHeading] = useState(0); // 0..360
  // const headingRef = useRef(0);
  const [currLocationText, setcurrLocationText] = useState("");
  const [destLocationText, setDestLocationText] = useState("");
  const [showSnackbar, setShowSnackbar] = useState(false);
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

  // TODO: Once we have the actual routing we will need to call it here
  // TODO: We will need to add a check that makes sure that the user put in valid locations
  // This function handles making sure that the user has entered both a current
  // location and a destination before starting routing.
  const handleStartRoutingPress = () => {
    if (currLocationText && destLocationText) {
      console.log(`Routing from ${currLocationText} to ${destLocationText}...`);
    } else {
      setShowSnackbar(true);
    }
  };

  // For smooth rotation animation
  // const rotation = useRef(new Animated.Value(0)).current;

  // useEffect(() => {
  //   Magnetometer.setUpdateInterval(100);

  //   const sub = Magnetometer.addListener((data) => {
  //     const raw = headingFromMagnetometer(data);
  //     const smoothed = smoothAngle(headingRef.current, raw, 0.2);
  //     headingRef.current = smoothed;
  //     setHeading(smoothed);
  //   });

  //   return () => sub.remove();
  // }, []);

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

  // useEffect(() => {
  //   // To make the arrow point North, rotate the arrow opposite the heading
  //   // If heading is 90° (east), arrow should rotate -90° to point north.
  //   Animated.timing(rotation, {
  //     toValue: -heading + 90,
  //     duration: 80,
  //     useNativeDriver: true,
  //   }).start();
  // }, [heading, rotation]);

  // const rotateStyle = useMemo(
  //   () => ({
  //     transform: [
  //       {
  //         rotate: rotation.interpolate({
  //           inputRange: [-360, 360],
  //           outputRange: ["-360deg", "360deg"],
  //         }),
  //       },
  //     ],
  //   }),
  //   [rotation],
  // );

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
          options={options}
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
          options={options}
          locationText={destLocationText}
          setLocationText={setDestLocationText}
        />
        <Button
          mode="contained"
          style={styles.button}
          disabled={false} // will be if they havent put in both locations
          onPress={handleStartRoutingPress}
        >
          Let's Go!
        </Button>

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
        visible={showSnackbar}
        onDismiss={() => setShowSnackbar(false)}
        duration={2000}
      >
        You need to enter both your currenet location and destination to start
        routing.
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
