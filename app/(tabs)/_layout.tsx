import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/haptic-tab";
import { useColorScheme } from "@/hooks/use-color-scheme";

import { store } from "@/redux/appState";
import { PaperProvider } from "react-native-paper";
import { Provider } from "react-redux";
import HouseIcon from "../../assets/images/icons/house.svg";
import MapIcon from "../../assets/images/icons/map.svg";
import RouteIcon from "../../assets/images/icons/route.svg";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Provider store={store}>
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
                <HouseIcon width={28} height={28} color="#ffffff" />
              ),
            }}
          />
          <Tabs.Screen
            name="routing"
            options={{
              title: "Routing",
              tabBarIcon: () => (
                <RouteIcon width={28} height={28} color="#ffffff" />
              ),
            }}
          />
          <Tabs.Screen
            name="map"
            options={{
              title: "Map",
              tabBarIcon: () => (
                <MapIcon width={28} height={28} color="#ffffff" />
              ),
            }}
          />
        </Tabs>
      </PaperProvider>
    </Provider>
  );
}
