import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/haptic-tab";
import { useColorScheme } from "@/hooks/use-color-scheme";

import { PaperProvider } from "react-native-paper";
import MapIcon from "../../assets/images/icons/map.svg";
import RouteIcon from "../../assets/images/icons/route.svg";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <PaperProvider>
      <Tabs
        screenOptions={{
          tabBarStyle: { backgroundColor: "#0015BA" },
          tabBarActiveTintColor: "#ffffff",
          headerShown: false,
          tabBarButton: HapticTab,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: () => (
              <RouteIcon width={28} height={28} color="#ffffff" />
            ),
          }}
        />
        <Tabs.Screen
          name="map"
          options={{
            title: "map",
            tabBarIcon: () => (
              <MapIcon width={28} height={28} color="#ffffff" />
            ),
          }}
        />
      </Tabs>
    </PaperProvider>
  );
}
