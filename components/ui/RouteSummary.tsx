import { useFonts } from "expo-font";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface RouteSummaryProps {
  setIsRouteStarted: (isStarted: boolean) => void;
  duration?: string;
  distance?: string;
  currentLocation?: string;
  destination?: string;
}

export default function RouteSummary(props: RouteSummaryProps) {
  const {setIsRouteStarted, 
    duration = "XX", 
    distance = "XX", 
    currentLocation = "Current Location", 
    destination = "Destination"  } = props;
  
  const [fontsLoaded] = useFonts({
    "MuseoModerno-Bold": require("../../assets/fonts/MuseoModerno-Bold.ttf"),
    "OrelegaOne": require("../../assets/fonts/OrelegaOne-Regular.ttf"),
  });

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      
      {/* Directions header */}
      <Text style={styles.heading}>Directions:</Text>

      {/* Stops card */}
      <View style={styles.stopsCard}>
        <View style={styles.stopRow}>
          <View style={styles.dot} />
          <Text style={styles.stopText}>{currentLocation}</Text>
        </View>

        {/* Dashed line between stops */}
        <View style={styles.dashedLineContainer}>
        {[...Array(4)].map((_, i) => (
        <View key={i} style={styles.dashedDot} />
        ))}
        </View>
        <View style={styles.stopRow}>
          <View style={styles.dot} />
          <Text style={styles.stopText}>{destination}</Text>
        </View>
      </View>

      {/* Bottom row: time/distance + start button */}
      <View style={styles.bottomRow}>
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{duration} min</Text>
          <Text style={styles.distanceText}>{distance} ft </Text>
        </View>

        <TouchableOpacity
          style={styles.startButton}
          onPress={() => setIsRouteStarted(true)}
        >
          <Text style={styles.startButtonText}>START ROUTE</Text>
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
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  heading: {
    fontFamily: "OrelegaOne",
    fontSize: 26,
    color: "#0A2145",
    marginBottom: 16,
  },
 stopsCard: {
    backgroundColor: "#C2DCF0",
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 28,
    marginBottom: 20,
  },
  stopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#356EC4",
  },
  stopText: {
    fontFamily: "OrelegaOne",
    fontSize: 25,
    color: "#356EC4",
  },
  dashedLineContainer: {
    paddingLeft: 7,
    paddingVertical: 6,
    gap: 6,
  },
  dashedDot: {
    width: 3,
    height: 3,
    borderRadius: 999,
    backgroundColor: "#356EC4",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timeContainer: {
    flexDirection: "column",
  },
  timeText: {
    fontFamily: "OrelegaOne",
    fontSize: 28,
    color: "#356EC4",
  },
  distanceText: {
    fontFamily: "OrelegaOne",
    fontSize: 16,
    color: "#356EC4",
  },
  startButton: {
    backgroundColor: "#356EC4",
    borderRadius: 44,
    paddingHorizontal: 28,
    paddingVertical: 20,
  },
  startButtonText: {
    fontFamily: "OrelegaOne",
    fontSize: 24,
    color: "#fff",
    letterSpacing: 0.5,
  },
});