/**
 * File: BottomPaneContent.tsx
 * Purpose: Bottom pane default content — quick-link destination shortcuts and
 *          map tag filters shown when no location node is selected.
 * Author: Cole Charpentier
 * Date Created: 2026-04-23
 */

import InfoIcon from "@/assets/images/icons/info.svg";
import TagBookIcon from "@/assets/images/icons/Map Tags/book.svg";
import TagBookWhiteIcon from "@/assets/images/icons/Map Tags/bookWhite.svg";

import TagBusIcon from "@/assets/images/icons/Map Tags/busStop.svg";
import TagBusWhiteIcon from "@/assets/images/icons/Map Tags/busStopWhite.svg";

import TagComputerIcon from "@/assets/images/icons/Map Tags/computer.svg";
import TagComputerWhiteIcon from "@/assets/images/icons/Map Tags/computerWhite.svg";

import TagFoodIcon from "@/assets/images/icons/Map Tags/food.svg";
import TagFoodWhiteIcon from "@/assets/images/icons/Map Tags/foodWhite.svg";

import TagPrinterIcon from "@/assets/images/icons/Map Tags/printer.svg";
import TagPrinterWhiteIcon from "@/assets/images/icons/Map Tags/printerWhite.svg";

import TagRestroomIcon from "@/assets/images/icons/Map Tags/privateRestroom.svg";
import TagRestroomWhiteIcon from "@/assets/images/icons/Map Tags/privateRestroomWhite.svg";

import TagShowAllIcon from "@/assets/images/icons/Map Tags/showAll.svg";
import TagShowAllWhiteIcon from "@/assets/images/icons/Map Tags/showAllWhite.svg";
import FoodIcon from "@/assets/images/icons/Quick Links/food_quickLinks.svg";
import LectureHallIcon from "@/assets/images/icons/Quick Links/lectureHall.svg";
import UnionIcon from "@/assets/images/icons/Quick Links/union.svg";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { graph, Node } from "@/maps/graph";
import {
  addToSelectedFeatures,
  clearSelectedFeatures,
  useAppDispatch,
  useAppSelector,
} from "@/redux/appState";
import React, { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Button, Dialog, Text as PaperText, Portal } from "react-native-paper";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

interface QuickLink {
  label: string;
  nodeId: number;
  Icon: React.ComponentType<{ width?: number; height?: number; fill?: string }>;
}

interface TagFilter {
  label: string;
  featureKey: string;
  Icon: React.ComponentType<{ width?: number; height?: number }>;
  SelectedIcon: React.ComponentType<{ width?: number; height?: number }>;
}

const QUICK_LINKS: QuickLink[] = [
  { label: "Eaton", nodeId: 10145, Icon: LectureHallIcon },
  { label: "LEEP2", nodeId: 10040, Icon: LectureHallIcon },
  { label: "Wescoe", nodeId: 10347, Icon: LectureHallIcon },
  { label: "Union", nodeId: 10370, Icon: UnionIcon },
  { label: "Underground", nodeId: 10374, Icon: FoodIcon },
];

// featureKey strings must match the keys in FEATURE_TO_TAG in index.tsx
const TAG_FILTERS: TagFilter[] = [
  {
    label: "Show All",
    featureKey: "Show All",
    Icon: TagShowAllIcon,
    SelectedIcon: TagShowAllWhiteIcon,
  },
  {
    label: "Food",
    featureKey: "Food",
    Icon: TagFoodIcon,
    SelectedIcon: TagFoodWhiteIcon,
  },
  {
    label: "Restrooms",
    featureKey: "Private Restrooms",
    Icon: TagRestroomIcon,
    SelectedIcon: TagRestroomWhiteIcon,
  },
  {
    label: "Printers",
    featureKey: "Printers",
    Icon: TagPrinterIcon,
    SelectedIcon: TagPrinterWhiteIcon,
  },
  {
    label: "Computers",
    featureKey: "Computers",
    Icon: TagComputerIcon,
    SelectedIcon: TagComputerWhiteIcon,
  },
  {
    label: "Bus Stop",
    featureKey: "Bus Stop",
    Icon: TagBusIcon,
    SelectedIcon: TagBusWhiteIcon,
  },
  {
    label: "Study",
    featureKey: "Study Area",
    Icon: TagBookIcon,
    SelectedIcon: TagBookWhiteIcon,
  },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BottomPaneContentProps {
  onQuickLinkPress: (node: Node, label: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BottomPaneContent({
  onQuickLinkPress,
}: BottomPaneContentProps) {
  const colorScheme = useColorScheme();
  const darkMode = colorScheme === "dark";

  const [showInfo, setShowInfo] = useState(false);

  const [activeFilterButton, setActiveFilterButton] = useState<string | null>(
    null,
  );

  const dispatch = useAppDispatch();
  const selectedFeatures: string[] = useAppSelector(
    (s) => s.jayWalk.selectedFeatures,
  );

  const showAllActive = TAG_FILTERS.filter(
    (f) => f.featureKey !== "Show All",
  ).every((f) => selectedFeatures.includes(f.featureKey));

  function handleFilterPress(featureKey: string) {
    // If clicking the already-selected button → deselect everything
    if (activeFilterButton === featureKey) {
      setActiveFilterButton(null);
      dispatch(clearSelectedFeatures());
      return;
    }

    // SHOW ALL
    if (featureKey === "Show All") {
      setActiveFilterButton("Show All");

      dispatch(clearSelectedFeatures());

      TAG_FILTERS.filter((f) => f.featureKey !== "Show All").forEach((f) => {
        dispatch(addToSelectedFeatures(f.featureKey));
      });

      return;
    }

    // SINGLE FILTER
    setActiveFilterButton(featureKey);

    dispatch(clearSelectedFeatures());
    dispatch(addToSelectedFeatures(featureKey));
  }

  function isFilterActive(featureKey: string): boolean {
    return activeFilterButton === featureKey;
  }

  return (
    <View style={styles.container}>
      {/* ── Info Button ──────────────────────────────────────── */}
      <Pressable style={styles.infoButton} onPress={() => setShowInfo(true)}>
        <View style={styles.infoButtonCircle}>
          <InfoIcon width={22} height={22} />
        </View>
      </Pressable>

      {/* ── Quick Links ──────────────────────────────────────── */}
      <Text
        style={[styles.sectionLabel, { color: darkMode ? "#fff" : "#000" }]}
      >
        Quick Links
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {QUICK_LINKS.map((link) => {
          const node = graph.nodes.find((n) => n.id === link.nodeId) ?? null;

          return (
            <Pressable
              key={link.label}
              style={styles.quickChip}
              onPress={() => {
                if (node) onQuickLinkPress(node, link.label);
              }}
            >
              <View style={styles.quickIconWrapper}>
                <link.Icon width={34} height={34} fill="#FFFFFF" />
                <Text style={styles.quickLabel}>{link.label}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── Map Filters ──────────────────────────────────────── */}
      <Text
        style={[
          styles.sectionLabel,
          { marginTop: 16 },
          { color: darkMode ? "#fff" : "#000" },
        ]}
      >
        Filter Map Tags
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {TAG_FILTERS.map((filter) => {
          const active = isFilterActive(filter.featureKey);
          const IconToShow = active ? filter.SelectedIcon : filter.Icon;

          return (
            <Pressable
              key={filter.featureKey}
              style={styles.filterChip}
              onPress={() => handleFilterPress(filter.featureKey)}
            >
              <View
                style={[
                  styles.filterIconWrapper,
                  {
                    backgroundColor: active ? "#356EC4" : "#EDF3FB",
                    borderColor: active ? "#356EC4" : "transparent",
                  },
                ]}
              >
                <IconToShow width={32} height={32} />

                <Text
                  style={[
                    styles.filterLabel,
                    { color: active ? "#FFFFFF" : "#356EC4" },
                  ]}
                >
                  {filter.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── Logo — visible only in high position ─────────────── */}
      <View style={styles.logoSection}>
        <Image
          source={require("../../assets/images/JayWalk-Logo1.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.logoWordmark}>JayWalk</Text>
      </View>

      {/* ── Info Modal ───────────────────────────────────────── */}
      <Portal>
        <Dialog
          visible={showInfo}
          onDismiss={() => setShowInfo(false)}
          style={{ borderRadius: 28, backgroundColor: "#ffffff" }}
        >
          <View style={styles.dialogHeader}>
            <Dialog.Title style={styles.dialogTitle}>
              How to use JayWalk
            </Dialog.Title>
            <Image
              source={require("../../assets/images/JayWalk-Logo1.png")}
              style={{ width: 36, height: 36 }}
              resizeMode="contain"
            />
          </View>

          <Dialog.Content style={{ paddingHorizontal: 0 }}>
            <ScrollView
              style={styles.dialogScroll}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.dialogScrollInner}>
                <PaperText style={styles.infoBodyText}>
                  JayWalk helps you navigate around campus with both indoor and
                  outdoor directions.
                </PaperText>

                <PaperText style={styles.infoSectionTitle}>
                  Getting a Route
                </PaperText>
                <PaperText style={styles.infoBodyText}>
                  Type your destination into the search bar. It will then expand
                  so you can enter your current location. Press the arrow to
                  generate your route preview, then tap{" "}
                  <PaperText style={styles.infoEmphasis}>The Arrow</PaperText>{" "}
                  to begin navigating.
                </PaperText>
                <PaperText style={styles.infoBodyText}>
                  JayWalk will guide you with step-by-step directions both
                  indoors and outdoors along the way.
                </PaperText>

                <PaperText style={styles.infoSectionTitle}>
                  During Navigation
                </PaperText>
                <PaperText style={styles.infoBodyText}>
                  You can{" "}
                  <PaperText style={styles.infoEmphasis}>End Route</PaperText>{" "}
                  at any time to stop early, or{" "}
                  <PaperText style={styles.infoEmphasis}>Reroute</PaperText> if
                  you've gone off course.
                </PaperText>

                <PaperText style={styles.infoSectionTitle}>
                  Route Filters
                </PaperText>
                <PaperText style={styles.infoBodyText}>
                  Before starting a route you can set preferences:
                </PaperText>
                <PaperText style={styles.infoBodyText}>
                  •{" "}
                  <PaperText style={styles.infoEmphasis}>Accessible</PaperText>{" "}
                  — limits the route to wheelchair-accessible paths.
                </PaperText>
                <PaperText style={styles.infoBodyText}>
                  •{" "}
                  <PaperText style={styles.infoEmphasis}>Indoor Only</PaperText>{" "}
                  or{" "}
                  <PaperText style={styles.infoEmphasis}>
                    Outdoor Only
                  </PaperText>{" "}
                  — restricts the route to your preferred environment.
                </PaperText>

                <PaperText style={styles.infoSectionTitle}>
                  Bottom Pane
                </PaperText>
                <PaperText style={styles.infoBodyText}>
                  Swipe up the pane at the bottom of the screen to access:
                </PaperText>
                <PaperText style={styles.infoBodyText}>
                  •{" "}
                  <PaperText style={styles.infoEmphasis}>Quick Links</PaperText>{" "}
                  — tap a popular destination to set it as your destination
                  instantly.
                </PaperText>
                <PaperText style={styles.infoBodyText}>
                  •{" "}
                  <PaperText style={styles.infoEmphasis}>Map Filters</PaperText>{" "}
                  — highlight locations on the map by tag, such as food,
                  restrooms, printers, and more.
                </PaperText>

                <PaperText style={styles.infoSectionTitle}>
                  Location Info
                </PaperText>
                <PaperText style={styles.infoBodyText}>
                  Tap anywhere on the map to see information about that
                  location. From there you can tap{" "}
                  <PaperText style={styles.infoEmphasis}>Go To</PaperText> to
                  set it as your destination.
                </PaperText>
              </View>
            </ScrollView>
          </Dialog.Content>

          <Dialog.Actions style={{ paddingHorizontal: 16, paddingVertical: 0 }}>
            <Button
              mode="contained"
              onPress={() => setShowInfo(false)}
              style={{
                backgroundColor: "#356EC4",
                borderRadius: 44,
                paddingHorizontal: 12,
                paddingVertical: 0,
                minWidth: 0,
                marginVertical: -12,
              }}
              labelStyle={{ fontFamily: "SF Pro Display", color: "#fff" }}
            >
              Got it
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
    paddingBottom: 8,
  },

  logoSection: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 32,
    paddingBottom: 16,
    gap: 12,
  },

  logo: {
    width: 100,
    height: 100,
  },

  logoWordmark: {
    fontFamily: "SF Pro Display",
    fontWeight: "700",
    fontSize: 32,
    color: "#0A2145",
    letterSpacing: 1,
  },

  sectionLabel: {
    fontFamily: "SF Pro Display",
    fontSize: 18,
    color: "#000000",
    marginBottom: 10,
  },

  chipRow: {
    flexDirection: "row",
    gap: 10,
    paddingBottom: 4,
  },

  // ── Quick Link chips ──────────────────────────────────────

  quickChip: {
    alignItems: "center",
  },

  quickIconWrapper: {
    width: 90,
    height: 90,
    borderRadius: 22,
    backgroundColor: "#356EC4",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },

  quickLabel: {
    fontFamily: "SF Pro Display",
    fontSize: 12,
    color: "#FFFFFF",
    textAlign: "center",
  },

  // ── Tag Filter chips ──────────────────────────────────────

  filterChip: {
    alignItems: "center",
    flexDirection: "column",
    width: 90,
  },

  filterIconWrapper: {
    width: 90,
    height: 90,
    borderRadius: 22,
    backgroundColor: "#EDF3FB",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "transparent",
  },

  filterSelected: {
    backgroundColor: "#356EC4",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },

  filterUnselected: {
    backgroundColor: "#EDF3FB",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },

  filterInner: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },

  filterLabel: {
    fontFamily: "SF Pro Display",
    fontSize: 12,
    textAlign: "center",
    marginTop: 2,
  },

  // ── Info button ───────────────────────────────────────────

  infoButton: {
    position: "absolute",
    top: 0,
    right: 0,
    padding: 4,
    zIndex: 10,
  },

  infoButtonCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#356EC4",
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Info modal ────────────────────────────────────────────

  dialogScroll: {
    maxHeight: 420,
  },

  dialogScrollInner: {
    paddingHorizontal: 20,
  },

  dialogHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  dialogTitle: {
    fontFamily: "SF Pro Display",
    fontSize: 22,
    color: "#0A2145",
  },

  infoSectionTitle: {
    fontFamily: "SF Pro Display",
    fontWeight: "600",
    fontSize: 14,
    color: "#0A2145",
    marginTop: 12,
    marginBottom: 4,
  },

  infoBodyText: {
    fontFamily: "SF Pro Display",
    fontSize: 13,
    color: "#333",
    lineHeight: 20,
    marginBottom: 4,
  },

  infoEmphasis: {
    fontFamily: "SF Pro Display",
    fontWeight: "600",
    color: "#356EC4",
  },
});
