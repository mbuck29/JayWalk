/**
 * File: _layout.tsx
 * Purpose: Specify the tab layout of the app
 * Author: Michael B, C. Cooper
 * Date Created: 2026-02-03
 * Date Modified: 2026-02-11
 */

import { Tabs } from "expo-router";
import React, { useEffect, useState } from "react";

import { HapticTab } from "@/components/haptic-tab";

import { useAppSelector } from "@/redux/appState";
import { navigate } from "expo-router/build/global-state/routing";
import { TouchableOpacity } from "react-native";
import HouseIcon from "../../assets/images/icons/house.svg";
import MapIcon from "../../assets/images/icons/map.svg";
import RouteIcon from "../../assets/images/icons/route.svg";

export default function TabLayout() {
  const route = useAppSelector((state) => state.jayWalk.route);
  const [hasRoute, setHasRoute] = useState(false); // Determine if routing is enabled based on the presence of a route in the state

  useEffect(() => {
    setHasRoute(!!route);
  }, [route]);
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: "#0015BA" },
        tabBarActiveTintColor: "#ffffff",
        tabBarInactiveTintColor: "#888888",
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: () => (
            <HouseIcon width={28} height={28} color="#ffffff" />
          ),
        }}
      />
      <Tabs.Screen
        name="routing"
        options={{
          title: "Routing",
          tabBarIcon: () => (
            <RouteIcon
              width={28}
              height={28}
              color={hasRoute ? "#ffffff" : "#888888"}
            />
          ),
          tabBarButton: (props) => {
            return (
              <TouchableOpacity
                disabled={!hasRoute}
                style={{
                  opacity: hasRoute ? 1 : 0.5,
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 7,
                }}
                onPress={() => navigate("/routing")}
              >
                {props.children}
              </TouchableOpacity>
            );
          },
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          tabBarIcon: () => <MapIcon width={28} height={28} color="#ffffff" />,
        }}
      />
    </Tabs>
  );
}
