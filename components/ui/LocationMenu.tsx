import React from "react";
import { Menu } from "react-native-paper";

type LocationMenuProps = {
  visible: boolean;
  onDismiss: () => void;
  anchor: React.ReactNode;
  options: string[];
  locationText: string;
  setLocationText: (text: string) => void;
};

export default function LocationMenu({
  visible,
  onDismiss,
  anchor,
  options,
  locationText,
  setLocationText,
}: LocationMenuProps) {
  return (
    // This is the menu that is shown when the user clicks on the text input to select a location.
    // It shows a list of options that the user can select from based on their input.
    <Menu
      visible={visible}
      onDismiss={onDismiss}
      anchor={anchor} // This is the element that the menu is anchored to, in this case it will be the text input. The menu will appear below this element.
      style={{ marginTop: 55 }} // This makes the menu appear below the text input
    >
      {options
        .filter(
          (o) =>
            o.toLowerCase().includes(locationText.toLowerCase()) && // This filters out options based on the user input
            !o.includes("~"), // This filters out options that are not real locations,
        )
        .slice(0, 5) // This limits the number of options shown to 5 so that it doesnt get too long

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
    </Menu>
  );
}
