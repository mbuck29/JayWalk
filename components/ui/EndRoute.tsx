/**
 * File: EndRoute.tsx
 * Purpose: A button to end the route when the user is on the map
 * Author: Michael B
 * Date Created: 2026-03-01
 */

import { clearRoute, useAppDispatch } from "@/redux/appState";
import { navigate } from "expo-router/build/global-state/routing";
import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

interface EndRouteProps {
  setIsRouteStarted: (isStarted: boolean) => void;
}

export default function EndRoute(props: EndRouteProps) {
  const { setIsRouteStarted } = props;
  const dispatch = useAppDispatch();
  const handleEndRoute = () => {
    setIsRouteStarted(false);
    dispatch(clearRoute()); // Clear the route from the state when ending the route
    navigate("/(tabs)");
  };
  return (
    <TouchableOpacity onPress={handleEndRoute} style={styles.endButton}>
      <Text style={styles.endButtonText}>End</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  endButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "#C42514",
    padding: 10,
    borderRadius: 40,
    height: "8%",
    width: "28%",
    alignItems: "center",
    justifyContent: "center",
  },
  endButtonText: {
    color: "#fff",
    fontSize: 36,
    fontFamily: "Orelega One",
  },
});
