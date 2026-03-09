/**
 * File: RouteSummary.tsx
 * Purpose: A bottom sheet type view to summarize the route
 * Author: Michael B
 * Date Created: 2026-03-01
 */

import { metersToFeet } from "@/app/Utils/directions";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import DashedLine from "react-native-dashed-line";
import { calculateRouteTime } from "../../app/Utils/routingUtils";

interface RouteSummaryProps {
  setIsRouteStarted: (isStarted: boolean) => void;
  startingLocation?: string;
  endingLocation?: string;
  routeLength: number;
}

export default function RouteSummary(props: RouteSummaryProps) {
  const { setIsRouteStarted } = props;
  const routeLengthMiles = props.routeLength / 1609.344; // the length from the route is in meters so we need to make into miles
  const timeOfTrip = calculateRouteTime(props.routeLength); // Use our util to get the time it may take on avg
  const length = Math.round(metersToFeet(props.routeLength));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Directions:</Text>
      <View style={styles.startAndFinish}>
        <View style={styles.locationRow}>
          <View style={styles.bulletPoint} />
          <Text style={styles.locationText}>{props.startingLocation}</Text>
        </View>
        <DashedLine
          dashLength={4}
          dashGap={4}
          dashThickness={1}
          dashColor="#356EC4"
          style={{
            width: "33%",
            transform: [{ rotate: "90deg" }],
            alignSelf: "flex-start",
            marginLeft: -30, // Move 10 pixels to the left
          }}
        />
        <View style={styles.locationRow}>
          <View style={styles.bulletPoint} />
          <Text style={styles.locationText}>{props.endingLocation}</Text>
        </View>
      </View>
      <View style={styles.TimeAndStart}>
        <View style={styles.timeSection}>
          <Text style={[styles.timeText, { fontSize: 24 }]}>
            {timeOfTrip.toFixed(0)} min{" "}
            {/* We are using toFixed in these two locations to make the numbers more readable */}
          </Text>
          <Text style={styles.timeText}>
            {length} feet
          </Text>
        </View>
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => setIsRouteStarted(true)}
        >
          <Text style={styles.startButtonText}>Start Route</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    flex: 1,
    width: "100%",
    backgroundColor: "#ffffff",
    opacity: 1,
    padding: 10,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 10,
    fontFamily: "Orelega One",
  },
  startAndFinish: {
    flexDirection: "column",
    alignSelf: "center",
    gap: 20,
    backgroundColor: "#C2DCF0",
    borderRadius: 49,
    padding: 20,
    marginBottom: 20,
    width: "80%",
  },
  TimeAndStart: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timeSection: {
    fontSize: 18,
    backgroundColor: "#C2DCF0",
    fontFamily: "Orelega One",
    flexDirection: "column",
    marginLeft: -10,
    paddingVertical: 10,
    paddingLeft: 50,
    width: "70%",
    height: 60,
  },
  timeText: {
    fontSize: 18,
    fontFamily: "Orelega One",
    color: "#356EC4",
  },
  locationRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  bulletPoint: {
    height: 25,
    width: 25,
    borderRadius: 12.5,
    backgroundColor: "#356EC4",
  },
  locationText: {
    marginLeft: 10,
    fontSize: 24,
    color: "#356EC4",
    fontFamily: "Orelega One",
  },
  startButton: {
    backgroundColor: "#356EC4",
    padding: 10,
    borderRadius: 44,
    height: 65,
    width: "40%",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -30,
  },
  startButtonText: {
    fontFamily: "OrelegaOne",
    fontSize: 24,
    color: "#fff",
  },
});
