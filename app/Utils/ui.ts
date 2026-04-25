import { useColorScheme } from "react-native";

export function isDarkMode()
{
    return useColorScheme() == "dark";
}