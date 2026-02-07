import React from "react";
import { Menu } from "react-native-paper";

type LocationMenuProps = {
  visible: boolean;
  onDismiss: () => void;
  anchor: React.ReactNode;
  options: string[];
  locationText: string;
  setLocationText: (text: string) => void;
  children?: React.ReactNode;
};

export default function LocationMenu({
  visible,
  onDismiss,
  anchor,
  options,
  locationText,
  setLocationText,
  children,
}: LocationMenuProps) {
  return (
    <Menu
      visible={visible}
      onDismiss={onDismiss}
      anchor={anchor}
      style={{ marginTop: 55 }} // This makes the menu appear below the text input
    >
      {options
        // This filters out options based on the user input
        .filter((o) => o.toLowerCase().includes(locationText.toLowerCase()))

        // This takes those options and create an item for each of them
        .map((option) => (
          <Menu.Item
            key={option}
            // If the user selects an option then we set that as there input and close the menu
            onPress={() => {
              setLocationText(option);
              onDismiss();
            }}
            title={option}
          />
        ))}
      {children}
    </Menu>
  );
}
