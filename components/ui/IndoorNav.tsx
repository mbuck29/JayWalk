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
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Arrow from "../../assets/images/icons/arrow.svg";
import Map from "../../assets/images/icons/map.svg";
import IndoorMap from "./IndoorMap";

interface IndoorNavProps {
  instrList: Direction[];
  setIsRouteStarted: (isStarted: boolean) => void;
  currentIndoorSegmentKey: string;
  setShowReroutePrompt: (x: boolean) => void;
  setIsManualReroute: (x: boolean) => void;
}

export default function IndoorNav({
  instrList,
  setIsRouteStarted,
  currentIndoorSegmentKey,
  setShowReroutePrompt,
  setIsManualReroute,
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
  const stopLen = currentRoute?.stops?.length ?? 0;

  const handleEndRoute = () => {
    setIsRouteStarted(false);
    dispatch(clearRoute()); // Clear the route from the state when ending the route
    navigate("/(tabs)");
  };

  // In the indoor nav there is no way for us to know if the user is off path so we will have to trust them
  // to use a manual reroute if they feel the directions are off
  const handleReroutePress = () => {
    setIsManualReroute(true);
    setShowReroutePrompt(true);
  };

  // The true timeline of steps, without prompts. This is what Next/Prev should walk.
  const allSteps = React.useMemo(() => {
    return instrList.filter((s) => !s.prompt);
  }, [instrList]);

  // Determine whether a direction belongs to an indoor node
  // nodes that are indoor have a building field that is not undefined
  const isIndoorStep = React.useCallback(
    (step: Direction) => {
      const stop = currentRoute?.stops?.[step.node];
      return !!stop?.building;
    },
    [currentRoute],
  );

  // Find the best step index for a given route node index.
  // If multiple steps reference the same node, pick the one closest to the
  // current active step so we do not snap back to the first matching instruction.
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const findStepIndexForNode = (nodeIdx: number) => {
    if (!allSteps.length) return 0;

    // First: exact matches
    const exactMatches = allSteps
      .map((step, index) => ({ step, index }))
      .filter(({ step }) => step.node === nodeIdx);

    if (exactMatches.length) {
      let bestIndex = exactMatches[0].index;
      let bestDelta = Math.abs(exactMatches[0].index - activeStepIndex);

      for (const match of exactMatches) {
        const delta = Math.abs(match.index - activeStepIndex);
        if (delta < bestDelta) {
          bestDelta = delta;
          bestIndex = match.index;
        }
      }

      return bestIndex;
    }

    // Second: prefer the first step ahead of the current node
    const forwardMatch = allSteps.findIndex((step) => step.node > nodeIdx);
    if (forwardMatch !== -1) return forwardMatch;

    // Third: if nothing is ahead, use the last step behind the current node
    for (let i = allSteps.length - 1; i >= 0; i--) {
      if (allSteps[i].node < nodeIdx) return i;
    }

    return 0;
  };

  // Find the current contiguous indoor segment in the INSTRUCTION TIMELINE.
  // This lets us support routes like indoor -> outdoor -> indoor by only showing
  // the indoor instruction chunk the user is currently in.
  const currentIndoorInstructionSegment = React.useMemo(() => {
    if (!allSteps.length) return null;

    const activeStep = allSteps[activeStepIndex];
    if (!activeStep) return null;

    if (!isIndoorStep(activeStep)) return null;

    let start = activeStepIndex;
    let end = activeStepIndex;

    // Walk backward until we leave the current indoor run
    while (start > 0 && isIndoorStep(allSteps[start - 1])) {
      start--;
    }

    // Walk forward until we leave the current indoor run
    while (end < allSteps.length - 1 && isIndoorStep(allSteps[end + 1])) {
      end++;
    }

    return { start, end };
  }, [allSteps, activeStepIndex, isIndoorStep]);

  // The list that is actually shown in IndoorNav, only the indoor steps for the
  // current indoor instruction segment the user is in.
  const displaySteps = React.useMemo(() => {
    if (!currentIndoorInstructionSegment) return [];

    return allSteps.slice(
      currentIndoorInstructionSegment.start,
      currentIndoorInstructionSegment.end + 1,
    );
  }, [allSteps, currentIndoorInstructionSegment]);

  const safeSetCurrentNode = (nodeIdx: number) => {
    if (!stopLen) return;
    const clamped = Math.max(0, Math.min(nodeIdx, stopLen - 1));
    dispatch(setCurrentNode(clamped));
  };

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
    if (next === activeStepIndex) return;

    setActiveStepIndex(next);
    safeSetCurrentNode(allSteps[next].node);
  };

  const handlePrev = () => {
    if (!allSteps.length) return;

    const prev = Math.max(activeStepIndex - 1, 0);
    if (prev === activeStepIndex) return;

    setActiveStepIndex(prev);
    safeSetCurrentNode(allSteps[prev].node);
  };

  // Keep active step synced with global currentNodeIndex changes
  // (e.g. GPS updates or other UI changing the current node).
  useEffect(() => {
    if (!allSteps.length) return;
    setActiveStepIndex(findStepIndexForNode(currentNodeIndex));
  }, [currentNodeIndex, currentIndoorSegmentKey, allSteps]);

  // Debugging useEffect to log current node and active step whenever they change
  useEffect(() => {
    /*console.log("currentNodeIndex", currentNodeIndex);
    console.log("currentNode", currentNodeObj);
    console.log(
      "activeStepIndex",
      activeStepIndex,
      "activeStep",
      allSteps[activeStepIndex],
    );*/
  }, [currentNodeObj, activeStepIndex, allSteps]);

  return (
    <>
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
          <View style={styles.endAndRerouteRow}>
            <TouchableOpacity
              style={styles.endAndRerouteButton}
              onPress={handleReroutePress}
            >
              <Text style={styles.endAndRerouteText}>Reroute</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.endAndRerouteButton}
              onPress={handleEndRoute}
            >
              <Text style={styles.endAndRerouteText}>End</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.progressContainer}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <TouchableOpacity
                style={[
                  styles.progressButton,
                  {
                    // Change background color to indicate if the button is disabled or not
                    backgroundColor:
                      activeStepIndex > 0 ? "#356EC4" : "#888888",
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
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
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
        {isViewingFloorPlan && <IndoorMap></IndoorMap>}
      </View>
    </>
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
    backgroundColor: "#356EC4",
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
    fontFamily: "MuseoModerno-Bold",
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
  endAndRerouteRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginLeft: 8,
  },
  endAndRerouteButton: {
    backgroundColor: "#C42514",
    paddingVertical: 10,
    paddingHorizontal: 26,
    //width: "30%",
    borderRadius: 40,
    alignSelf: "flex-end",
    alignItems: "center",
    marginBottom: 10,
    marginRight: 10,
  },
  endAndRerouteText: {
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
