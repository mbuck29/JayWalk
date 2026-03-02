import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { store } from "@/redux/appState";
import { useFonts } from "expo-font";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PaperProvider } from "react-native-paper";
import { Provider } from "react-redux";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    // Load the Orelega One font
    "Orelega One": require("../assets/images/fonts/OrelegaOne-Regular.ttf"),
  });

  // Here is a wait to load the font before rendering the app, to prevent UI issues related to fonts.
  if (!fontsLoaded) {
    return null; // or a loading spinner
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Wrap the app in a GestureHandlerRootView to support gestures */}
      <Provider store={store}>
        {/* Wrap the app in a Redux Provider to make the store available to all components */}
        <PaperProvider>
          {/* Wrap the app in a PaperProvider to support Material Design components */}
          <ThemeProvider
            value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
          >
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="modal"
                options={{ presentation: "modal", title: "Modal" }}
              />
            </Stack>
            <StatusBar style="auto" />
          </ThemeProvider>
        </PaperProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}
