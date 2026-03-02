/**
 * File: IndoorNav.tsx
 * Purpose: A list based component that will show the users the steps/directions to nav the indoor portion of route
 * Author: Michael B
 * Date Created: 2026-03-01
 */

import { Direction } from "@/app/Utils/directions";
import { getRoute, getState } from "@/app/Utils/state";
import {
  clearRoute,
  setCurrentNode,
  useAppDispatch,
  useAppSelector,
} from "@/redux/appState";
import { navigate } from "expo-router/build/global-state/routing";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Arrow from "../../assets/images/icons/arrow.svg";
import Close from "../../assets/images/icons/close.svg";
import Map from "../../assets/images/icons/map.svg";
import { floorPlanMap } from "../../maps/floorPlanMap";

interface IndoorNavProps {
  instrList: Direction[];
  setIsRouteStarted: (isStarted: boolean) => void;
}

export default function IndoorNav({
  instrList,
  setIsRouteStarted,
}: IndoorNavProps) {
  const state = getState();
  const currentRoute = getRoute(state);
  const dispatch = useAppDispatch();
  const currentNodeIndex = useAppSelector((state) => state.jayWalk.currentNode);
  const currentNodeObj = currentRoute?.stops[currentNodeIndex];
  const currentBuildingName = currentNodeObj?.building?.name;
  const buildingNameWithoutTilde = currentBuildingName // Clean up building name to match keys in floorPlanMap
    ?.replace("~", "") // Remove tilde
    .trim() // Remove leading/trailing spaces
    .split(" ")[0] // Take first word (e.g., "Eaton")
    .toLowerCase(); // Convert to lowercase
  const currentFloor = currentNodeObj?.floor;
  const [isViewingFloorPlan, setIsViewingFloorPlan] = useState(false); // State to simply control if user is seeing floor plan
  const routeLen = currentRoute?.route?.length ?? 0;
  const destNodeIdx = (currentRoute?.stops?.length ?? 1) - 1; // simple grabbing of last nodes index

  // Get the floor plan image for the current building and floor, if available
  const floorPlanImage =
    buildingNameWithoutTilde && currentFloor
      ? (floorPlanMap as Record<string, any>)[buildingNameWithoutTilde]?.[ // This is as floorPlanMap is typed as Record<string, any>, we need to assert that to avoid TypeScript errors. We can improve this typing later.
          currentFloor
        ]
      : undefined;

  const handleEndRoute = () => {
    setIsRouteStarted(false);
    dispatch(clearRoute()); // Clear the route from the state when ending the route
    navigate("/(tabs)");
  };

  // The true timeline of steps, without prompts. This is what Next/Prev should walk.
  const allSteps = React.useMemo(() => {
    return instrList.filter((s) => !s.prompt);
  }, [instrList]);

  // last instruction index in allSteps that belongs to the destination node we need this for
  // indoor only routes as it keeps it from navigating to the map
  const lastStepIdxForDest = React.useMemo(() => {
    if (!allSteps.length) return 0;
    let last = 0;
    for (let i = 0; i < allSteps.length; i++) {
      // loop till we hit the destination nodes index
      if (allSteps[i].node === destNodeIdx) last = i;
    }
    return last;
  }, [allSteps, destNodeIdx]);

  // The list that is actually shown in IndoorNav, only indoor steps
  const displaySteps = React.useMemo(() => {
    return allSteps.filter((s, idx) => {
      const routeNode = currentRoute?.route[s.node]; // get the node on the route that this instruction corresponds to
      if (routeNode?.indoors) return true; // only include it if that node is indoors
      if (idx === lastStepIdxForDest) return true; // only the case for indoor as we want to show the you have arrived message
    });
  }, [allSteps, currentRoute]);

  // Find the index in allSteps that corresponds to the currentNodeIndex, and keep that in state as activeStepIndex. This is the "true" active step that Next/Prev should update.
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  // Find the best step index for a given route node index.
  // If multiple steps reference the same node, this picks the FIRST one.
  // (If you want "closest to current active" instead, tell me and I'll tweak it.)
  const findStepIndexForNode = (nodeIdx: number) => {
    const i = allSteps.findIndex((x) => x.node === nodeIdx);
    return i === -1 ? 0 : i;
  };

  const safeSetCurrentNode = (nodeIdx: number) => {
    if (!routeLen) return;
    const clamped = Math.max(0, Math.min(nodeIdx, routeLen - 1));
    dispatch(setCurrentNode(clamped));
  };

  // Keep active step synced with global currentNodeIndex changes
  // (e.g. GPS updates or other UI changing the current node).
  useEffect(() => {
    if (!allSteps.length) return;
    setActiveStepIndex(findStepIndexForNode(currentNodeIndex));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentNodeIndex, allSteps.length]);

  // Compute which item in the *display* list should be highlighted.
  // If current active step is outdoors, it won't exist in displaySteps -> -1.
  const activeDisplayIndex = React.useMemo(() => {
    const activeStep = allSteps[activeStepIndex];
    if (!activeStep) return -1;
    return displaySteps.findIndex((s) => s === activeStep);
  }, [activeStepIndex, allSteps, displaySteps]);

  // Handlers for Next and Prev buttons. These update the active step index, which in turn updates the global currentNodeIndex via the useEffect above.
  const handleNext = () => {
    if (!allSteps.length) return;
    const next = Math.min(activeStepIndex + 1, allSteps.length - 1);
    setActiveStepIndex(next);
    safeSetCurrentNode(allSteps[next].node);
  };

  // Prev is similar but in the opposite direction
  const handlePrev = () => {
    if (!allSteps.length) return;
    const prev = Math.max(activeStepIndex - 1, 0);
    setActiveStepIndex(prev);
    safeSetCurrentNode(allSteps[prev].node);
  };

  // Debugging useEffect to log current node and active step whenever they change
  useEffect(() => {
    console.log("currentNodeIndex", currentNodeIndex);
    console.log("currentNode", currentNodeObj);
    console.log(
      "activeStepIndex",
      activeStepIndex,
      "activeStep",
      allSteps[activeStepIndex],
    );
  }, [currentNodeObj, activeStepIndex, allSteps]);

  return (
    <View style={styles.listContainer}>
      <View style={styles.appHeader}>
        <Text style={styles.appTitle}>JayWalk</Text>
      </View>
      <View style={styles.listHeader}>
        <Text style={styles.indoorNavTitle}>Directions</Text>
        <TouchableOpacity
          style={styles.floorMapButton}
          onPress={() => setIsViewingFloorPlan(!isViewingFloorPlan)}
        >
          <Map height={40} width={40} />
          <Text
            style={{
              color: "#fff",
              fontSize: 18,
              fontFamily: "Orelega One",
              flexWrap: "wrap",
              marginLeft: 10,
              width: 80,
              textAlign: "center",
            }}
          >
            View Floor plan
          </Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={displaySteps}
        style={styles.instrList}
        renderItem={({ item, index }) => (
          <View
            style={[
              styles.instrContainer,
              {
                // Display different background colors so the user can know which is the current step
                backgroundColor:
                  index === activeDisplayIndex ? "#356EC4" : "#C2DCF0",
              },
            ]}
          >
            <Text
              style={[
                styles.instrText, // Same here for the text color
                { color: index === activeDisplayIndex ? "#fff" : "#356EC4" },
              ]}
            >
              {item.direction}
            </Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />
      <View style={styles.BottomButtonContainer}>
        <TouchableOpacity style={styles.endButton} onPress={handleEndRoute}>
          <Text style={styles.endButtonText}>End</Text>
        </TouchableOpacity>
        <View style={styles.progressContainer}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <TouchableOpacity
              style={[
                styles.progressButton,
                {
                  // Change background color to indicate if the button is disabled or not
                  backgroundColor: activeStepIndex > 0 ? "#356EC4" : "#888888",
                },
              ]}
              onPress={() => {
                handlePrev();
              }}
              disabled={activeStepIndex <= 0} // Disable the button if we're at the beginning of the list
            >
              <Arrow width={40} height={40} color={"#fff"} />
            </TouchableOpacity>
            <Text style={styles.progressText}>Prev</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text style={styles.progressText}>Next</Text>
            <TouchableOpacity
              style={[
                styles.progressButton,
                {
                  // Same here for the next button, change color if disabled
                  backgroundColor:
                    activeStepIndex >= allSteps.length - 1 // Not -1 because we need to be able to transtion to outside
                      ? "#888888"
                      : "#356EC4",
                },
              ]}
              onPress={() => handleNext()}
              disabled={activeStepIndex >= allSteps.length - 1} // if we reach the end of the list, only possible if route is indoors only
            >
              <Arrow
                width={40}
                height={40}
                color="#fff"
                style={{ transform: [{ rotate: "180deg" }] }}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {isViewingFloorPlan && floorPlanImage && (
        <View
          style={{
            position: "absolute",
            top: 0,
            width: "100%",
            height: "100%",
          }}
        >
          <View
            style={{
              // This View is to gray out the background when we show the floor plan to the user
              position: "absolute",
              top: 0,
              width: "100%",
              height: "100%",
              backgroundColor: "rgba(0,0,0,0.5)", // semi-transparent gray
              zIndex: 99,
            }}
            pointerEvents="auto"
          />
          <View style={{ zIndex: 100, flex: 1, justifyContent: "center" }}>
            <View style={styles.floorPlanHeader}>
              <TouchableOpacity
                onPress={() => setIsViewingFloorPlan(false)}
                style={{
                  padding: 10,
                  borderRadius: 40,
                }}
              >
                <Close width={30} height={30} />
              </TouchableOpacity>
            </View>
            <Image
              source={floorPlanImage}
              style={{
                width: 300,
                height: 300,
                zIndex: 100,
                alignSelf: "center",
              }}
            />
            <View style={styles.floorPlanFooter} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    backgroundColor: "#0A2145",
    width: "100%",
    height: "100%",
    gap: 10,
    alignItems: "center",
  },
  appHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    backgroundColor: "#0015BA",
    paddingHorizontal: 30,
    paddingBottom: 10,
    height: 90,
    width: 400,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "85%",
  },
  appTitle: {
    color: "#fff",
    fontSize: 24,
  },
  indoorNavTitle: {
    color: "#fff",
    fontSize: 32,
    fontFamily: "Orelega One",
    textAlign: "left",
  },
  instrList: {
    paddingHorizontal: 20,
    height: "80%",
  },
  instrContainer: {
    width: "100%",
    borderRadius: 43,
    paddingHorizontal: 15,
    paddingVertical: 15,
    justifyContent: "center",
  },
  instrText: {
    fontSize: 24,
    fontFamily: "Orelega One",
    textAlign: "center",
  },
  floorMapButton: {
    flexDirection: "row",
    backgroundColor: "#356EC4",
    padding: 10,
    borderRadius: 40,
  },
  progress: {
    flexDirection: "column",
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#C2DCF0",
    padding: 10,
  },
  progressText: {
    color: "#356EC4",
    fontSize: 24,
  },
  progressButton: {
    backgroundColor: "#356EC4",
    height: 55,
    width: 55,
    borderRadius: 27.5,
    alignItems: "center",
    justifyContent: "center",
  },
  BottomButtonContainer: {
    flexDirection: "column",
    justifyContent: "space-between",
    width: "100%",
  },
  endButton: {
    backgroundColor: "#C42514",
    padding: 10,
    width: "30%",
    borderRadius: 40,
    alignSelf: "flex-end",
    alignItems: "center",
    marginBottom: 10,
    marginRight: 10,
  },
  endButtonText: {
    color: "#fff",
    fontSize: 36,
    fontFamily: "Orelega One",
  },
  floorPlanHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignSelf: "center",
    padding: 5,
    width: 300,
    backgroundColor: "#0A2145",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
  },
  floorPlanFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignSelf: "center",
    padding: 20,
    width: 300,
    backgroundColor: "#0A2145",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
});
