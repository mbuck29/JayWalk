import { graph, Node } from "@/maps/graph";
import { useAppSelector } from "@/redux/appState";
import { BlurView } from "expo-blur";
import React, { Dispatch, SetStateAction, useRef, useState } from "react";
import {
  Image,
  TextInput as RNTextInput,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { TextInput } from "react-native-paper";
import AccessibleSelected from "../../assets/images/icons/Search Icons/accessible_selected.svg";
import AccessibleUnselected from "../../assets/images/icons/Search Icons/accessible_unselected.svg";
import AllRoutesSelected from "../../assets/images/icons/Search Icons/allRoutes_selected.svg";
import AllRoutesUnselected from "../../assets/images/icons/Search Icons/allRoutes_unselected.svg";
import IndoorOnlySelected from "../../assets/images/icons/Search Icons/indoor_selected.svg";
import IndoorOnlyUnselected from "../../assets/images/icons/Search Icons/indoor_unselected.svg";
import OutdoorOnlySelected from "../../assets/images/icons/Search Icons/outdoor_selected.svg";
import OutdoorOnlyUnselected from "../../assets/images/icons/Search Icons/outdoor_unselected.svg";
import SearchIcon from "../../assets/images/icons/Search Icons/search.svg";
import LocationMenu from "./LocationMenu";

interface SearchHeaderProps {
  setDestination: Dispatch<SetStateAction<Node[]>>;
  setCurrLocation: Dispatch<SetStateAction<Node | null>>;
}

export default function SearchHeader(props: SearchHeaderProps) {
  const { setDestination, setCurrLocation } = props;
  const destination = useAppSelector((state) => state.jayWalk.destination);
  const [isCurrentMenuVisible, setIsCurrentMenuVisible] = useState(false);
  const [destLocationText, setDestLocationText] = useState("");
  const [currLocationText, setCurrLocationText] = useState("");
  const [selectedPreference, setSelectedPreference] = useState(["All Routes"]);
  const currLocInputRef = useRef<RNTextInput | null>(null);
  const hasDestination = destination !== "" && destination !== undefined;

  function handlePreferencePress(preference: string) {
    setSelectedPreference((prev) => {
      // If All Routes is clicked, it becomes the only selection
      if (preference === "All Routes") {
        return ["All Routes"];
      }

      const isAlreadySelected = prev.includes(preference);

      // Deselecting a selected non-default option
      if (isAlreadySelected) {
        const next = prev.filter((p) => p !== preference);
        return next.length === 0 ? ["All Routes"] : next;
      }

      // Start from current selections without All Routes
      let next = prev.filter((p) => p !== "All Routes");

      // Indoor/Outdoor are mutually exclusive
      if (preference === "Indoor Only") {
        next = next.filter((p) => p !== "Outdoor Only");
      }

      if (preference === "Outdoor Only") {
        next = next.filter((p) => p !== "Indoor Only");
      }

      return [...next, preference];
    });
  }

  const renderRoutePrefrenceButtons = () => {
    const preferences = [
      "All Routes",
      "Accessible",
      "Indoor Only",
      "Outdoor Only",
    ];
    return preferences.map((preference) => (
      <TouchableOpacity
        key={preference}
        style={
          selectedPreference.includes(preference)
            ? {
                paddingVertical: 6,
                paddingHorizontal: 12,
                backgroundColor: "#356EC4",
                borderRadius: 20,
              }
            : {
                paddingVertical: 6,
                paddingHorizontal: 12,
                backgroundColor: "#E5E5E5",
                borderRadius: 20,
              }
        }
        onPress={() => {
          console.log(`pressed ${preference}`);
          handlePreferencePress(preference);
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 6,
          }}
        >
          {/* Need to put the icon here for the buttons */}
          {preference === "All Routes" &&
            (selectedPreference.includes(preference) ? (
              <AllRoutesSelected width={16} height={16} />
            ) : (
              <AllRoutesUnselected width={16} height={16} />
            ))}
          {preference === "Accessible" &&
            (selectedPreference.includes(preference) ? (
              <AccessibleSelected width={16} height={16} />
            ) : (
              <AccessibleUnselected width={16} height={16} />
            ))}
          {preference === "Indoor Only" &&
            (selectedPreference.includes(preference) ? (
              <IndoorOnlySelected width={16} height={16} />
            ) : (
              <IndoorOnlyUnselected width={16} height={16} />
            ))}
          {preference === "Outdoor Only" &&
            (selectedPreference.includes(preference) ? (
              <OutdoorOnlySelected width={16} height={16} />
            ) : (
              <OutdoorOnlyUnselected width={16} height={16} />
            ))}
          <Text
            style={{
              fontSize: 14,
              color: selectedPreference.includes(preference)
                ? "#fff"
                : "#356EC4",
            }}
          >
            {preference}
          </Text>
        </View>
      </TouchableOpacity>
    ));
  };
  return (
    <BlurView style={styles.SearchHeaderContainer} intensity={100} tint="light">
      <View style={styles.insideBlurContainer}>
        <View style={styles.TopRowContainer}>
          {/* campanile logo */}
          <View style={{ flexDirection: "row" }}>
            <Image
              source={require("../../assets/images/JayWalk-Logo1.png")}
              style={styles.logo}
              resizeMode="cover"
            />{" "}
            {/* Text input with LocationMenu */}
            {/* When the user looks for a location we populate and display a 
                menu of locations for them to select. Making it easier to find there
                locaiton.*/}
            <LocationMenu
              visible={isCurrentMenuVisible} // We only want to show the menu
              //when the user is actively using the text field
              onDismiss={() => {
                setIsCurrentMenuVisible(false);
                currLocInputRef.current?.blur();
              }}
              oppisiteName={destLocationText} // This is used to make sure that the user doesnt select the same location for both current and destination, as that would break our routing algo. So we pass the destination name here so that the menu can filter it out from the options.
              anchor={
                // The location menu needs something to anchor it, so that it knows where to appear. In this case we anchor it to the text input for the current location.
                //current location box
                <TextInput
                  ref={currLocInputRef}
                  value={currLocationText}
                  placeholder={"Where to?"}
                  underlineStyle={{ height: 0 }}
                  activeUnderlineColor="transparent"
                  activeOutlineColor="transparent"
                  underlineColor="transparent"
                  textColor="#000"
                  cursorColor="#000"
                  selectionColor="#356EC4"
                  mode="outlined"
                  theme={{ roundness: 44 }}
                  outlineColor="transparent"
                  onChangeText={setCurrLocationText}
                  style={{
                    backgroundColor: "transparent",
                    justifyContent: "center",
                    fontSize: 18,
                    flex: 1,
                  }}
                  contentStyle={{
                    fontFamily: "SF Pro",
                  }}
                  onFocus={() => setIsCurrentMenuVisible(true)} // When the user focuses on the text input we want to show the menu so that they can select there location from the list of options.
                  onChange={() => setIsCurrentMenuVisible(true)}
                />
              }
              options={graph.nodes} // They are selecting from the nodes so we pass them here
              // We pass the current text in the text field to the menu so that it can filter the options based on what the user has typed.
              // This makes it easier for the user to find there location. We also pass the set function so when they select something we can set it as there choice
              locationText={currLocationText}
              setLocation={setCurrLocation}
              setLocationText={setCurrLocationText}
              onSelect={() => currLocInputRef.current?.blur()}
            />{" "}
          </View>
          {/* The search button */}
          <TouchableOpacity
            onPress={() => {
              setIsCurrentMenuVisible(false);
              currLocInputRef.current?.blur();
            }}
            style={{
              backgroundColor: "#356EC4",
              borderRadius: 20,
              height: 40,
              width: 40,
              marginTop: 4,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <SearchIcon width={24} height={24} />
          </TouchableOpacity>
        </View>
        {hasDestination && <View style={styles.MiddleRowContainer}></View>}
        <View style={styles.BottomRowContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {renderRoutePrefrenceButtons()}
          </ScrollView>
        </View>
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  SearchHeaderContainer: {
    position: "absolute",
    top: "8%",
    left: "5%",
    right: "5%",
    borderRadius: 20,
    overflow: "hidden",
  },
  insideBlurContainer: {
    borderColor: "rgba(255,255,255,0.35)",
    borderWidth: 1,
    borderStyle: "solid",
    borderRadius: 20,
  },
  logo: {
    width: 40,
    height: 40,
  },
  TopRowContainer: {
    flex: 1,
    paddingTop: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  MiddleRowContainer: {
    flexDirection: "row",
  },
  BottomRowContainer: {
    flexDirection: "row",
    borderTopWidth: 2,
    borderTopColor: "#E5E5E5",
    paddingTop: 8,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
});
