/**
 * File: RouteSummary.tsx
 * Purpose: A bottom sheet type view to summarize the route
 * Author: Michael B
 * Date Created: 2026-03-01
 */

import { metersToFeet } from "@/app/Utils/directions";
import { BlurView } from "expo-blur";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, useColorScheme, View } from "react-native";
import Svg, { Line } from "react-native-svg";
import { calculateRouteTime } from "../../app/Utils/routingUtils";

import ArrivedIcon from "@/assets/images/icons/Misc/arrived.svg";
import CurrentIcon from "@/assets/images/icons/Route Summary/current.svg";

interface RouteSummaryProps {
  setIsRouteStarted: (isStarted: boolean) => void;
  onCancel?: () => void;
  startingLocation?: string;
  endingLocation?: string;
  routeLength: number;
}

export default function RouteSummary(props: RouteSummaryProps) {
  const { setIsRouteStarted, onCancel } = props;
  const timeOfTrip = calculateRouteTime(props.routeLength);
  const length = Math.round(metersToFeet(props.routeLength));
  const darkMode = useColorScheme() === "dark";

  return (
    <BlurView intensity={80} tint={darkMode ? "dark" : "light"} style={styles.container}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>Directions</Text>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Start and destination card */}
      <View style={styles.startAndFinish}>
        <View style={styles.locationRow}>
          <View style={styles.iconCircle}>
            <CurrentIcon style={styles.iconImage} />
          </View>
          <Text style={styles.locationText}>{props.startingLocation}</Text>
        </View>

        <View style={styles.dashedConnector}>
          <Svg height="28" width="2">
            {[0, 6, 12, 18, 24].map((y) => (
              <Line
                key={y}
                x1="1"
                y1={y}
                x2="1"
                y2={y + 4}
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            ))}
          </Svg>
        </View>

        <View style={styles.locationRow}>
          <View style={styles.iconCircle}>
            <ArrivedIcon style={styles.iconImage} />
          </View>
          <Text style={styles.locationText}>{props.endingLocation}</Text>
        </View>
      </View>

      {/* Time and Start button */}
      <View style={styles.timeAndStart}>
        <View style={styles.timeSection}>
          <Text style={styles.timeTextLarge}>{timeOfTrip.toFixed(0)} Mins</Text>
          <Text style={styles.timeTextSmall}>{length} Ft</Text>
        </View>
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => setIsRouteStarted(true)}
        >
          <Text style={styles.startButtonText}>Start Route</Text>
        </TouchableOpacity>
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: "100%",
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
    overflow: "hidden",
    padding: 20,
    paddingBottom: 30,
    borderColor: "rgba(255,255,255,0.35)",
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
  fontSize: 28,
  fontWeight: "bold",
  color: "#ffffff",
  paddingLeft: 10,
  },
  cancelButton: {
    backgroundColor: "#2C3E6B",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  cancelButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  startAndFinish: {
    backgroundColor: "#356EC4",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconImage: {
  maxWidth: "60%",
  maxHeight: "60%",
  },
  iconCircle: {
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: "#2C3E6B",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  },
  locationText: {
    fontSize: 20,
    color: "#ffffff",
    fontWeight: "500",
    flex: 1,
  },
  dashedConnector: {
    marginLeft: 18,
    marginVertical: 4,
  },
  timeAndStart: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#C2DCF0",
    borderRadius: 44,
    paddingLeft: 24,
    paddingRight: 6,
    paddingVertical: 6,
  },
  timeSection: {
    flexDirection: "column",
    justifyContent: "center",
  },
  timeTextLarge: {
    fontSize: 20,
    color: "#356EC4",
    fontWeight: "bold",
  },
  timeTextSmall: {
    fontSize: 13,
    color: "#356EC4",
  },
  startButton: {
    backgroundColor: "#356EC4",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  startButtonText: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "600",
  },
});