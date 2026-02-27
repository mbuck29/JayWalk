import { store } from "@/redux/appState";
import { Slot } from "expo-router";
import React from "react";
import { PaperProvider } from "react-native-paper";
import { Provider } from "react-redux";

export default function App() {
  console.log("App component rendered");
  return (
    <Provider store={store}>
      <PaperProvider>
        <Slot />
      </PaperProvider>
    </Provider>
  );
}
