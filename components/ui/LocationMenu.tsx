import { Node } from "@/maps/graph";
import React from "react";
import { Menu } from "react-native-paper";

type LocationMenuProps = {
  visible: boolean;
  onDismiss: () => void;
  anchor: React.ReactNode;
  options: Node[];
  locationText: string;
  setLocation: (node: Node) => void;
  setLocationText: (text: string) => void;
};

export default function LocationMenu({
  visible,
  onDismiss,
  anchor,
  options,
  locationText,
  setLocation,
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
            o.name.toLowerCase().includes(locationText.toLowerCase()) && // This filters out options based on the user input
            !o.name.includes("~"), // This filters out options that are not real locations,
        )
        .slice(0, 5) // This limits the number of options shown to 5 so that it doesnt get too long

        // This takes those options and create an item for each of them
        .map((option) => (
          <Menu.Item
            key={option.name}
            // If the user selects an option then we set that as there input and close the menu
            onPress={() => {
              setLocation(option);
              setLocationText(option.name);
              onDismiss();
            }}
            title={option.name}
          />
        ))}
    </Menu>
  );
}
