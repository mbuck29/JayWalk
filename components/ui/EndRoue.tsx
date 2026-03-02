import { clearRoute, useAppDispatch } from "@/redux/appState";
import { useFonts } from "expo-font";
import { navigate } from "expo-router/build/global-state/routing";
import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

interface EndRouteProps {
  setIsRouteStarted: (isStarted: boolean) => void;
}

export default function EndRoute(props: EndRouteProps) {
  const { setIsRouteStarted } = props;
  const dispatch = useAppDispatch();

  const [fontsLoaded] = useFonts({
  "OrelegaOne": require("../../assets/fonts/OrelegaOne-Regular.ttf"),
  });

  const handleEndRoute = () => {
    setIsRouteStarted(false);
    dispatch(clearRoute()); // Clear the route from the state when ending the route
    navigate("/(tabs)");
  };
  return (
    <TouchableOpacity onPress={handleEndRoute} style={styles.endButton}>
      <Text style={styles.endButtonText} >End Route</Text>
    </TouchableOpacity>
  );
}



const styles = StyleSheet.create({
  endButton: {
    position: "absolute",
    bottom: 40,
    right: 20,
    backgroundColor: "#C42514",
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 44,
  },
    endButtonText: {
    fontFamily: "OrelegaOne",
    fontSize: 20,
    color: "#fff",
  },
});
