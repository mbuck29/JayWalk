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
      <Text>End Route</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  endButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "#f82e18",
    padding: 10,
    borderRadius: 5,
  },
});
