import { graph, Node } from "@/maps/graph";
import { useAppSelector } from "@/redux/appState";
import { BlurView } from "expo-blur";
import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
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
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { Route } from "@/app/Utils/routing";
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

type HeaderMode = "editing-collapsed" | "editing-expanded" | "summary";

interface SearchHeaderProps {
  setDestination: Dispatch<SetStateAction<Node[]>>;
  setCurrLocation: Dispatch<SetStateAction<Node | null>>;
  destLocationText: string;
  setDestLocationText: Dispatch<SetStateAction<string>>;
  currLocationText: string;
  setCurrLocationText: Dispatch<SetStateAction<string>>;
  blurTint: "light" | "dark";
  routeStatus: "not started" | "previewing" | "started";
  setRouteStatus: Dispatch<
    SetStateAction<"not started" | "previewing" | "started">
  >;
  currentRoute: Route | null;
  currentNode: number;
}

export default function SearchHeader(props: SearchHeaderProps) {
  const {
    setDestination,
    setCurrLocation,
    destLocationText,
    setDestLocationText,
    currLocationText,
    setCurrLocationText,
    blurTint,
    setRouteStatus,
    routeStatus,
    currentRoute,
    currentNode,
  } = props;

  const destination = useAppSelector((state) => state.jayWalk.destination);

  const [headerMode, setHeaderMode] = useState<HeaderMode>("editing-collapsed");
  const [summaryText, setSummaryText] = useState("JayWalk");

  const [isCurrentMenuVisible, setIsCurrentMenuVisible] = useState(false);
  const [isDestMenuVisible, setIsDestMenuVisible] = useState(false);

  const [selectedPreference, setSelectedPreference] = useState(["All Routes"]);

  const searchButtonShake = useSharedValue(0);

  const summaryProgress = useSharedValue(0);

  const currLocInputRef = useRef<RNTextInput | null>(null);
  const destLocInputRef = useRef<RNTextInput | null>(null);

  const progress = useSharedValue(0);

  const hasDestination = destination !== "" && destination !== undefined;
  const isExpanded = headerMode === "editing-expanded";
  const isSummary = headerMode === "summary";

  function expandHeader() {
    setHeaderMode("editing-expanded");
    progress.value = withTiming(1, { duration: 260 });

    setIsCurrentMenuVisible(false);
    setIsDestMenuVisible(false);
    destLocInputRef.current?.blur();

    setTimeout(() => {
      currLocInputRef.current?.focus();
    }, 220);
  }

  function collapseHeader() {
    setHeaderMode("editing-collapsed");
    progress.value = withTiming(0, { duration: 260 });

    setIsCurrentMenuVisible(false);
    setIsDestMenuVisible(false);
    currLocInputRef.current?.blur();
    destLocInputRef.current?.blur();
  }

  function resetToEditingCollapsed() {
    setHeaderMode("editing-collapsed");
    progress.value = withTiming(0, { duration: 260 });
    summaryProgress.value = withTiming(0, { duration: 250 });
    setSummaryText("JayWalk");
    setIsCurrentMenuVisible(false);
    setIsDestMenuVisible(false);
    currLocInputRef.current?.blur();
    destLocInputRef.current?.blur();
  }

  useEffect(() => {
    if (routeStatus === "started" && currentRoute) {
      const currentDirection = currentRoute.directions[currentNode];
      setSummaryText(currentDirection?.direction ?? "JayWalk");
    }
  }, [routeStatus, currentRoute, currentNode]);

  function handleSearchPress() {
    const hasDestinationText = destLocationText.trim().length > 0;
    const hasCurrentLocationText = currLocationText.trim().length > 0;

    if (headerMode === "summary") {
      resetToEditingCollapsed();
      return;
    }

    // Collapsed: need destination before expanding
    if (!isExpanded) {
      if (!hasDestinationText) {
        triggerSearchButtonShake();
        return;
      }

      expandHeader();
      return;
    }

    // Expanded: collapse only if both are empty
    if (!hasDestinationText && !hasCurrentLocationText) {
      collapseHeader();
      return;
    }

    // Expanded: destination missing
    if (!hasDestinationText) {
      triggerSearchButtonShake();
      destLocInputRef.current?.focus();
      return;
    }

    // Expanded: current location missing
    if (!hasCurrentLocationText) {
      triggerSearchButtonShake();
      currLocInputRef.current?.focus();
      return;
    }

    // Expanded and both values exist -> do actual search/routing
    console.log("Run routing with:", {
      current: currLocationText,
      destination: destLocationText,
    });
    handleStartRoutingPress();
  }

  useEffect(() => {
    if (
      headerMode === "editing-expanded" &&
      destLocationText.trim().length === 0 &&
      currLocationText.trim().length === 0
    ) {
      collapseHeader();
    }
  }, [destLocationText, currLocationText, headerMode]);

  function handlePreferencePress(preference: string) {
    setSelectedPreference((prev) => {
      if (preference === "All Routes") {
        return ["All Routes"];
      }

      const isAlreadySelected = prev.includes(preference);

      if (isAlreadySelected) {
        const next = prev.filter((p) => p !== preference);
        return next.length === 0 ? ["All Routes"] : next;
      }

      let next = prev.filter((p) => p !== "All Routes");

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
            ? styles.preferenceSelected
            : styles.preferenceUnselected
        }
        onPress={() => handlePreferencePress(preference)}
      >
        <View style={styles.preferenceInner}>
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
            style={[
              styles.preferenceText,
              {
                color: selectedPreference.includes(preference)
                  ? "#fff"
                  : "#356EC4",
              },
            ]}
          >
            {preference}
          </Text>
        </View>
      </TouchableOpacity>
    ));
  };

  function handleStartRoutingPress() {
    setRouteStatus("previewing");

    // Start animation
    summaryProgress.value = withTiming(1, { duration: 250 });

    // Delay switching layout so animation can play
    setTimeout(() => {
      setHeaderMode("summary");
    }, 200);

    setCurrLocationText("");
    setDestLocationText("");

    setIsCurrentMenuVisible(false);
    setIsDestMenuVisible(false);
    currLocInputRef.current?.blur();
    destLocInputRef.current?.blur();
  }

  const animatedCurrentRowStyle = useAnimatedStyle(() => {
    return {
      height: withTiming(progress.value ? 40 : 0, { duration: 260 }),
      opacity: withTiming(progress.value ? 1 : 0, { duration: 180 }),
      marginBottom: withTiming(progress.value ? 8 : 0, { duration: 260 }),
      overflow: "hidden",
    };
  });

  const animatedLowerRowsStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: withTiming(0, { duration: 260 }),
        },
      ],
    };
  });

  // ADD THESE ANIMATED STYLES

  const animatedEditingContainer = useAnimatedStyle(() => {
    return {
      opacity: withTiming(summaryProgress.value ? 0 : 1, { duration: 200 }),
      transform: [
        {
          translateY: withTiming(summaryProgress.value ? -12 : 0, {
            duration: 250,
          }),
        },
      ],
    };
  });

  const animatedSummaryContainer = useAnimatedStyle(() => {
    return {
      opacity: withTiming(summaryProgress.value ? 1 : 0, { duration: 200 }),
      transform: [
        {
          translateY: withTiming(summaryProgress.value ? 0 : 12, {
            duration: 250,
          }),
        },
      ],
    };
  });

  const animatedTopLogoContainerStyle = useAnimatedStyle(() => {
    return {
      width: withTiming(progress.value ? 40 : 0, { duration: 260 }),
      opacity: withTiming(progress.value ? 1 : 0, { duration: 180 }),
      marginRight: withTiming(progress.value ? 8 : 0, { duration: 260 }),
      overflow: "hidden",
    };
  });

  const animatedMiddleLogoContainerStyle = useAnimatedStyle(() => {
    return {
      width: withTiming(progress.value ? 0 : 40, { duration: 260 }),
      opacity: withTiming(progress.value ? 0 : 1, { duration: 180 }),
      marginRight: withTiming(progress.value ? 0 : 8, { duration: 260 }),
      overflow: "hidden",
    };
  });

  const animatedSearchButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: searchButtonShake.value }],
    };
  });

  function triggerSearchButtonShake() {
    searchButtonShake.value = 0;

    searchButtonShake.value = withTiming(-8, { duration: 40 }, () => {
      searchButtonShake.value = withTiming(8, { duration: 40 }, () => {
        searchButtonShake.value = withTiming(-6, { duration: 40 }, () => {
          searchButtonShake.value = withTiming(6, { duration: 40 }, () => {
            searchButtonShake.value = withTiming(0, { duration: 40 });
          });
        });
      });
    });
  }

  // REPLACE YOUR RETURN BLOCK WITH THIS STRUCTURE

  return (
    <BlurView
      style={styles.searchHeaderContainer}
      intensity={80}
      tint={blurTint}
    >
      <View style={styles.insideBlurContainer}>
        <>
          {/* EDITING UI */}
          {headerMode !== "summary" && (
            <Animated.View style={animatedEditingContainer}>
              {/* Current location row */}
              <Animated.View
                style={[styles.currentRow, animatedCurrentRowStyle]}
              >
                <Animated.View
                  style={[styles.logoSlot, animatedTopLogoContainerStyle]}
                >
                  <Image
                    source={require("../../assets/images/JayWalk-Logo1.png")}
                    style={styles.logo}
                    resizeMode="cover"
                  />
                </Animated.View>

                <View style={styles.currentInputWrapper}>
                  <LocationMenu
                    visible={isCurrentMenuVisible}
                    onDismiss={() => {
                      setIsCurrentMenuVisible(false);
                      currLocInputRef.current?.blur();
                    }}
                    oppisiteName={destLocationText}
                    anchor={
                      <TextInput
                        ref={currLocInputRef}
                        value={currLocationText}
                        placeholder="Current location"
                        underlineStyle={{ height: 0 }}
                        activeUnderlineColor="transparent"
                        activeOutlineColor="transparent"
                        underlineColor="transparent"
                        textColor={blurTint === "dark" ? "#fff" : "#000"}
                        cursorColor={blurTint === "dark" ? "#fff" : "#000"}
                        selectionColor="#356EC4"
                        outlineColor="transparent"
                        onChangeText={setCurrLocationText}
                        style={styles.input}
                        contentStyle={styles.inputContent}
                        onFocus={() => setIsCurrentMenuVisible(true)}
                        onChange={() => setIsCurrentMenuVisible(true)}
                      />
                    }
                    options={graph.nodes}
                    locationText={currLocationText}
                    setLocation={setCurrLocation}
                    setLocationText={setCurrLocationText}
                    onSelect={() => currLocInputRef.current?.blur()}
                  />
                </View>
              </Animated.View>

              {/* Destination + preferences */}
              <Animated.View style={animatedLowerRowsStyle}>
                <View
                  style={[
                    styles.destinationRow,
                    {
                      borderTopColor: isExpanded ? "#E5E5E5" : "transparent",
                      borderTopWidth: 2,
                    },
                  ]}
                >
                  <Animated.View
                    style={[styles.logoSlot, animatedMiddleLogoContainerStyle]}
                  >
                    <Image
                      source={require("../../assets/images/JayWalk-Logo1.png")}
                      style={styles.logo}
                      resizeMode="cover"
                    />
                  </Animated.View>

                  <View style={styles.destinationInputWrapper}>
                    <LocationMenu
                      visible={isDestMenuVisible}
                      onDismiss={() => {
                        setIsDestMenuVisible(false);
                        destLocInputRef.current?.blur();
                      }}
                      oppisiteName={currLocationText}
                      anchor={
                        <TextInput
                          ref={destLocInputRef}
                          value={destLocationText}
                          placeholder="Where to?"
                          underlineStyle={{ height: 0 }}
                          activeUnderlineColor="transparent"
                          activeOutlineColor="transparent"
                          underlineColor="transparent"
                          textColor={blurTint === "dark" ? "#fff" : "#000"}
                          cursorColor={blurTint === "dark" ? "#fff" : "#000"}
                          selectionColor="#356EC4"
                          outlineColor="transparent"
                          onChangeText={setDestLocationText}
                          style={styles.input}
                          contentStyle={styles.inputContent}
                          onFocus={() => setIsDestMenuVisible(true)}
                          onChange={() => setIsDestMenuVisible(true)}
                        />
                      }
                      options={graph.nodes}
                      locationText={destLocationText}
                      setLocation={(node) => setDestination([node])}
                      setLocationText={setDestLocationText}
                      onSelect={() => destLocInputRef.current?.blur()}
                    />
                  </View>

                  <Animated.View style={animatedSearchButtonStyle}>
                    <TouchableOpacity
                      onPress={handleSearchPress}
                      style={styles.searchButton}
                    >
                      <SearchIcon width={20} height={20} />
                    </TouchableOpacity>
                  </Animated.View>
                </View>

                <View style={styles.bottomRowContainer}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.preferenceScrollContent}
                  >
                    {renderRoutePrefrenceButtons()}
                  </ScrollView>
                </View>
              </Animated.View>
            </Animated.View>
          )}

          {/* SUMMARY UI */}
          {headerMode === "summary" && (
            <Animated.View style={animatedSummaryContainer}>
              <View style={styles.summaryRow}>
                <Image
                  source={require("../../assets/images/JayWalk-Logo1.png")}
                  style={styles.logo}
                  resizeMode="cover"
                />
                <Text
                  style={[
                    styles.summaryText,
                    {
                      color: blurTint === "dark" ? "#fff" : "#000",
                    },
                  ]}
                >
                  {summaryText}
                </Text>
              </View>
            </Animated.View>
          )}
        </>
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  searchHeaderContainer: {
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
    paddingTop: 8,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  logoSlot: {
    height: 40,
  },
  logo: {
    width: 40,
    height: 40,
  },
  currentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  currentInputWrapper: {
    flex: 1,
  },
  destinationRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 40,
  },
  destinationInputWrapper: {
    flex: 1,
    marginRight: 8,
  },
  input: {
    backgroundColor: "transparent",
    justifyContent: "center",
    fontSize: 18,
    height: 40,
    marginTop: 4,
  },
  inputContent: {
    fontFamily: "SF Pro",
  },
  searchButton: {
    backgroundColor: "#356EC4",
    borderRadius: 20,
    height: 36,
    width: 36,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
  },
  bottomRowContainer: {
    borderTopWidth: 2,
    borderTopColor: "#E5E5E5",
    paddingTop: 8,
    paddingBottom: 8,
    marginTop: 8,
  },
  preferenceScrollContent: {
    gap: 8,
  },
  preferenceSelected: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#356EC4",
    borderRadius: 20,
  },
  preferenceUnselected: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#E5E5E5",
    borderRadius: 20,
  },
  preferenceInner: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  preferenceText: {
    fontSize: 14,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 40,
    paddingVertical: 4,
  },
  summaryText: {
    fontSize: 20,
    fontWeight: "600",
    marginLeft: 10,
  },
});
