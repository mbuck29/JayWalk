/**
 * File: _layout.tsx
 * Purpose: Specify the tab layout of the app
 * Author: Michael B, C. Cooper
 * Date Created: 2026-02-03
 * Date Modified: 2026-02-28
 */

import { useAppSelector } from "@/redux/appState";
import { useFonts } from "expo-font";
import { Tabs } from "expo-router";
import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity } from "react-native";
import HouseIcon from "../../assets/images/icons/house.svg";
import MapIcon from "../../assets/images/icons/map.svg";
import RouteIcon from "../../assets/images/icons/route.svg";

export default function TabLayout() {
  const route = useAppSelector((state) => state.jayWalk.route);
  const [hasRoute, setHasRoute] = useState(false);

  const [fontsLoaded] = useFonts({
    OrelegaOne: require("../../assets/fonts/OrelegaOne-Regular.ttf"),
  });

  useEffect(() => {
    setHasRoute(!!route);
  }, [route]);

  if (!fontsLoaded) return null; // wait for font to load

  const renderTab = (
    Icon: any,
    label: string,
    enabled = true,
    iconSize = 48
  ) => (props: any) => (
    <TouchableOpacity
      {...props} 
      disabled={!enabled}
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon width={iconSize} height={iconSize} color={enabled ? "#fff" : "#888"} />
      <Text
        style={{
          marginTop: 6,
          fontSize: 12,
          color: enabled ? "#fff" : "#888",
          fontFamily: "OrelegaOne",
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: "#0A2145", height: 110, paddingBottom: 10 },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ tabBarButton: renderTab(HouseIcon, "HOME") }}
      />
      <Tabs.Screen
        name="routing"
        options={{ tabBarButton: renderTab(RouteIcon, "ROUTE", !!hasRoute, 50) }}
      />
      <Tabs.Screen
        name="map"
        options={{ tabBarButton: renderTab(MapIcon, "MAP") }}
      />
    </Tabs>
  );
}