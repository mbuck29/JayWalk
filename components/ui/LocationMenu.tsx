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
    <Menu visible={visible} onDismiss={onDismiss} anchor={anchor}>
      {options
        .filter((o) => o.toLowerCase().includes(locationText.toLowerCase()))
        .map((option) => (
          <Menu.Item
            key={option}
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
