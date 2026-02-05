import { ThemedText } from "@/components/themed-text";
import * as Location from 'expo-location';
import { Magnetometer } from "expo-sensors";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { watchLocation } from "../Utils/location";
import {
  headingFromMagnetometer,
  smoothAngle,
  useOrientation,
} from "../Utils/phoneOrientation";

export default function HomeScreen() {
  const motion = useOrientation();
  const alpha = motion?.rotation?.alpha ?? 0;
  const beta = motion?.rotation?.beta ?? 0;
  const gamma = motion?.rotation?.gamma ?? 0;
  const [heading, setHeading] = useState(0); // 0..360
  const headingRef = useRef(0);

  const [locationPermissionStatus, requestLocationPermissions] = Location.useForegroundPermissions();

  function hasLocationPermissions(): boolean
  {
    return locationPermissionStatus?.granted ?? false;
  }

  const [location, setLocation] = useState<Location.LocationObject | null>(null);

  // For smooth rotation animation
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Magnetometer.setUpdateInterval(100);

    const sub = Magnetometer.addListener((data) => {
      const raw = headingFromMagnetometer(data);
      console.log(`Raw heading: ${raw.toFixed(2)}`);
      const smoothed = smoothAngle(headingRef.current, raw, 0.2);
      console.log(`Smoothed heading: ${smoothed.toFixed(2)}`);
      headingRef.current = smoothed;
      setHeading(smoothed);
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    if(!hasLocationPermissions())
    {
      requestLocationPermissions();
    }

    if(hasLocationPermissions())
    {
      watchLocation(setLocation, errorReason => console.log("Location error: " + errorReason));
    }

  }, [locationPermissionStatus]);

  useEffect(() => {
    // To make the arrow point North, rotate the arrow opposite the heading
    // If heading is 90° (east), arrow should rotate -90° to point north.
    Animated.timing(rotation, {
      toValue: -heading,
      duration: 80,
      useNativeDriver: true,
    }).start();
  }, [heading, rotation]);

  const rotateStyle = useMemo(
    () => ({
      transform: [
        {
          rotate: rotation.interpolate({
            inputRange: [-360, 360],
            outputRange: ["-360deg", "360deg"],
          }),
        },
      ],
    }),
    [rotation],
  );

  return (
    <View style={styles.container}>
      <ThemedText type="title">Welcome to JayWalk!</ThemedText>
      <ThemedText>
        Orientation: {alpha.toFixed(2)}, {beta.toFixed(2)}, {gamma.toFixed(2)}
      </ThemedText>
      <ThemedText>
        Location: {location?.coords.latitude.toFixed(7) ?? "???"}, {location?.coords.longitude.toFixed(7) ?? "???"}
      </ThemedText>
      <View style={styles.compass}>
        {/* Arrow */}
        <Animated.View style={[styles.arrowWrap, rotateStyle]}>
          <View style={styles.arrow} />
          <View style={styles.arrowTail} />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: 16,
    paddingTop: 32,
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
  compass: {
    marginTop: 24,
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  northLabel: {
    position: "absolute",
    top: 10,
    fontSize: 18,
    fontWeight: "700",
  },

  arrowWrap: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
  },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderBottomWidth: 40,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "white",
    position: "absolute",
    top: 10,
  },
  arrowTail: {
    width: 6,
    height: 60,
    backgroundColor: "white",
    borderRadius: 3,
    position: "absolute",
    top: 50,
  },
});
