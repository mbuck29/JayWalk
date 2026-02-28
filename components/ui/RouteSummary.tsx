import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface RouteSummaryProps {
  setIsRouteStarted: (isStarted: boolean) => void;
}

export default function RouteSummary(props: RouteSummaryProps) {
  const { setIsRouteStarted } = props;
  return (
    <View style={styles.container}>
      <Text>Route Summary</Text>
      <TouchableOpacity
        style={styles.startButton}
        onPress={() => setIsRouteStarted(true)}
      >
        <Text style={styles.startButtonText}>Start Route</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 20,
    left: 20,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 42, 255, 0.9)",
    padding: 10,
    borderRadius: 10,
    width: "90%",
    height: 100,
  },
  startButton: {
    backgroundColor: "#18f82f",
    padding: 10,
    borderRadius: 5,
  },
  startButtonText: {
    color: "#fff",
  },
});
