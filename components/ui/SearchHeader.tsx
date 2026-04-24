import { graph, Node } from "@/maps/graph";
import { BlurView } from "expo-blur";
import * as Location from "expo-location";
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

import { route, Route } from "@/app/Utils/routing";
import { haversineMeters, sanitize } from "@/app/Utils/routingUtils";
import {
  clearRoute,
  setDestination,
  setRoute,
  setStart,
  useAppDispatch,
  useAppSelector,
} from "@/redux/appState";
import AccessibleSelected from "../../assets/images/icons/Search Icons/accessible_selected.svg";
import AccessibleUnselected from "../../assets/images/icons/Search Icons/accessible_unselected.svg";
import AllRoutesSelected from "../../assets/images/icons/Search Icons/allRoutes_selected.svg";
import AllRoutesUnselected from "../../assets/images/icons/Search Icons/allRoutes_unselected.svg";
import IndoorOnlySelected from "../../assets/images/icons/Search Icons/indoor_selected.svg";
import IndoorOnlyUnselected from "../../assets/images/icons/Search Icons/indoor_unselected.svg";
import OutdoorOnlySelected from "../../assets/images/icons/Search Icons/outdoor_selected.svg";
import OutdoorOnlyUnselected from "../../assets/images/icons/Search Icons/outdoor_unselected.svg";
import SearchIcon from "../../assets/images/icons/Search Icons/search.svg";
import Target from "../../assets/images/icons/target.svg";
import LocationMenu from "./LocationMenu";

type HeaderMode = "editing-collapsed" | "editing-expanded" | "summary";

interface SearchHeaderProps {
  destLocations: Node[];
  setDestinations: Dispatch<SetStateAction<Node[]>>;
  currLocation: Node | null;
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
  locationPermissionStatus: Location.PermissionResponse | null;
  location: Location.LocationObject | null;
}

export default function SearchHeader(props: SearchHeaderProps) {
  const {
    destLocations,
    setDestinations,
    currLocation,
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
    locationPermissionStatus,
    location,
  } = props;
  const dispatch = useAppDispatch();
  const state = useAppSelector((state) => state.jayWalk);

  const [headerMode, setHeaderMode] = useState<HeaderMode>("editing-collapsed");
  const [summaryText, setSummaryText] = useState("JayWalk");

  const [isCurrentMenuVisible, setIsCurrentMenuVisible] = useState(false);
  const [isDestMenuVisible, setIsDestMenuVisible] = useState(false);

  const [selectedPreference, setSelectedPreference] = useState(["All Routes"]);

  const searchButtonShake = useSharedValue(0);
  const currButtonShake = useSharedValue(0);

  const summaryProgress = useSharedValue(0);

  const currLocInputRef = useRef<RNTextInput | null>(null);
  const destLocInputRef = useRef<RNTextInput | null>(null);

  const progress = useSharedValue(0);

  const isExpanded = headerMode === "editing-expanded";

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

  useEffect(() => {
    if (routeStatus === "not started") {
      resetToEditingCollapsed();
    }
  }, [routeStatus]);

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

  function hasLocationPermissions(): boolean {
    return locationPermissionStatus?.granted ?? false;
  }

  const handleCurrentAreaPress = () => {
    if (!hasLocationPermissions()) {
      // If we dont have permission for distance we cant use this feature, so we tell the user that.
      triggerCurrButtonShake();
      return;
    }
    // If they havent given us a location we cant do anything so we just return.
    // This also helps with typing the the const lines below as we know that location is not null.
    if (!location) return;

    // Get the accuracy and coordinates of the location. We will use these to determine whether we can snap to a node and which node to snap to.
    const gpsAcc = location.coords.accuracy ?? 9999;
    const userLat = location.coords.latitude;
    const userLon = location.coords.longitude;

    console.log(`Location accuracy: ${gpsAcc.toFixed(2)} m`);
    console.log(`Current location: ${userLat}, ${userLon}`);

    // Initalize closestNode to null, we will use it to keep track of the closesnt node to the user as we loop through the nodes.
    let closestNode: { node: any; distanceM: number } | null = null;

    for (const node of graph.nodes) {
      // Calculate distance from user to node in meters using the haversine formula
      const dM = haversineMeters(userLat, userLon, node.y, node.x);

      // If there isnt a closest node or its closer than the current closest node, then set it as the closest node
      if (!closestNode || dM < closestNode.distanceM) {
        closestNode = { node, distanceM: dM };
      }
    }

    // This covers the case where for some reason our graph has no nodes, it also helps with typing below.
    if (!closestNode) return;

    console.log(
      `Closest node: ${closestNode.node.name} (id: ${
        closestNode.node.id
      }), distance: ${closestNode.distanceM.toFixed(1)} m`,
    );

    const MAX_ACCEPTABLE_ACC = 25; // don’t trust worse than this
    const snapThresholdM = Math.max(10, gpsAcc * 1.5); // dynamic threshold

    // In the case that the GPS accuracy is really bad, we dont want to use that as the starting location as it is most likely not
    // correct so we tell the user that and return/
    if (gpsAcc > MAX_ACCEPTABLE_ACC) {
      console.log(`GPS too noisy to snap (acc=${gpsAcc.toFixed(1)}m).`);
      return;
    }

    // If the user is close enough to a node we will assume that that is there starting location and set that for them.
    if (closestNode.distanceM <= snapThresholdM) {
      console.log(
        `Snapping to node (threshold=${snapThresholdM.toFixed(1)}m).`,
      );
      // For now just setting it as the name, but I think we have nodes that the user shouldnt see the name so I
      // we will need to come up for what the UI looks like for that.
      setCurrLocationText(closestNode.node.name); // update text field to show assumed location
      setCurrLocation(closestNode.node);
    } else {
      // If the user isnt close enough to a node we dont want to use that node as there Location as this wouldnt be accurate.
      // So we tell the user that with a toast message.
      console.log(
        `Not near any node (closest=${closestNode.distanceM.toFixed(
          1,
        )}m, threshold=${snapThresholdM.toFixed(1)}m).`,
      );
      triggerCurrButtonShake();
    }
  };

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

    // Before we start routing we need to know from and to for the algo to work
    console.log(`Routing from ${currLocation?.name} to ${destLocationText}...`);

    // Call the routing algorithm from the current to the destination nodes
    const calculatedRoute = route(state, currLocation!, destLocations);

    // If there is no route, log it and return
    if (!calculatedRoute) {
      dispatch(clearRoute());
      console.log("No route found!");
      return;
    }

    // Sanitize the route and then push it to the global state
    dispatch(setRoute(sanitize(calculatedRoute)));

    // Set the destination so it can be refernced later
    dispatch(
      setDestination({
        text: destLocationText,
        ids: destLocations.map((l) => l.id),
      }),
    );
    dispatch(setStart(currLocation!.name));

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

  const animatedCurrButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: currButtonShake.value }],
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

  function triggerCurrButtonShake() {
    currButtonShake.value = 0;

    currButtonShake.value = withTiming(-8, { duration: 40 }, () => {
      currButtonShake.value = withTiming(8, { duration: 40 }, () => {
        currButtonShake.value = withTiming(-6, { duration: 40 }, () => {
          currButtonShake.value = withTiming(6, { duration: 40 }, () => {
            currButtonShake.value = withTiming(0, { duration: 40 });
          });
        });
      });
    });
  }

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
                <Animated.View style={animatedCurrButtonStyle}>
                  <TouchableOpacity
                    onPress={handleCurrentAreaPress}
                    style={styles.currAreaButton}
                  >
                    <Target width={20} height={20} />
                  </TouchableOpacity>
                </Animated.View>
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
                      setLocation={(node) => setDestinations([node])}
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
  currAreaButton: {
    backgroundColor: "#356EC4",
    borderRadius: 20,
    height: 36,
    width: 36,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
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
