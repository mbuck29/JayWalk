/**
 * File: map.tsx
 * Purpose: The map tab of the app. Defines a map that the user can use to view the layout of campus.
 * Authors: Michael B, C. Cooper, Blake Jesse
 * Date Created: 2026-02-07
 * Date Modified: 2026-04-06
 */
import OptionsIcon from "@/assets/images/icons/options.svg";
import FeatureFilter from "@/components/ui/FeatureFilter";
import { graph, Graph } from "@/maps/graph";
import { Tag } from "@/maps/data";
import { setDestination, useAppDispatch, useAppSelector } from "@/redux/appState";
import { Asset } from "expo-asset";
import { useFonts } from "expo-font";
import { navigate } from "expo-router/build/global-state/routing";
import React, { useEffect, useRef, useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const DEBUG = false;

// ---------------------------------------------------------------------------
// Tag → display config
// Swap `emoji` for an `icon: require(...)` once you have custom assets.
// ---------------------------------------------------------------------------
const TAG_CONFIG: Record<Tag, { emoji: string; color: string; label: string }> = {
  bathrooms:  { emoji: "🚻", color: "#4A90D9", label: "Restroom"  },
  printers:   { emoji: "🖨️", color: "#7B68EE", label: "Printers"  },
  "bus stop": { emoji: "🚌", color: "#E8A020", label: "Bus Stop"  },
  food:       { emoji: "🍽️", color: "#E05C3A", label: "Food"      },
  computers:  { emoji: "💻", color: "#3AAE6E", label: "Computers" },
};

// Priority order — first matching tag wins for the marker icon
const TAG_PRIORITY: Tag[] = ["food", "bus stop", "bathrooms", "printers", "computers"];

// ---------------------------------------------------------------------------

export default function TabTwoScreen() {
  const mapRef = useRef<MapView>(null);
  const dispatch = useAppDispatch();
  const [selectedNode, setSelectedNode] = useState<any>(null);

  // Read the filter selections that FeatureFilter already manages in Redux.
  const selectedFeatures = useAppSelector((state) => state.jayWalk.selectedFeatures);

  // Map FeatureFilter display strings → Tag values used in node data.
  // "Study Area" has no matching Tag yet, so it is intentionally omitted.
  const FEATURE_TO_TAG: Record<string, Tag> = {
    "Private Restrooms": "bathrooms",
    "Printers":          "printers",
    "Food":              "food",
    "Computers":         "computers",
    "Bus Stop":          "bus stop",
  };

  // Derive the active tag set reactively — no separate local state needed.
  const activeTags = new Set<Tag>(
    selectedFeatures
      .map((f) => FEATURE_TO_TAG[f])
      .filter((t): t is Tag => t !== undefined),
  );

  useEffect(() => {
    Asset.fromModule(require("../../assets/images/icons/pin.png")).downloadAsync();
  }, []);

  const { width: screenWidth } = useWindowDimensions();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const PANEL_WIDTH = Math.min(screenWidth * 0.6, 320);

  const panelOpen = useSharedValue(false);

  const animatedPanelStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: withTiming(panelOpen.value ? 0 : PANEL_WIDTH, { duration: 250 }),
      },
    ],
    opacity: withTiming(panelOpen.value ? 1 : 0, { duration: 200 }),
  }));

  const [fontsLoaded] = useFonts({
    "MuseoModerno-Bold": require("../../assets/fonts/MuseoModerno-Bold.ttf"),
    OrelegaOne: require("../../assets/fonts/OrelegaOne-Regular.ttf"),
  });

  if (!fontsLoaded) return null;

  const KU = {
    latitude: 38.9541967,
    longitude: -95.2597806,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  // -------------------------------------------------------------------------
  // Render tag markers for every node that has at least one active tag.
  // Uses the highest-priority matching tag for the icon.
  // -------------------------------------------------------------------------
  function makeTagMarkers() {
    return graph.nodes
      .filter((node) => {
        if (node.name?.startsWith("~")) return false;
        return node.tags?.some((t) => activeTags.has(t));
      })
      .map((node) => {
        const primaryTag =
          TAG_PRIORITY.find((t) => node.tags.includes(t) && activeTags.has(t)) ??
          node.tags.find((t) => activeTags.has(t))!;

        const config = TAG_CONFIG[primaryTag];

        return (
          <Marker
            key={`tag-${node.id}`}
            coordinate={{ latitude: node.y, longitude: node.x }}
            tracksViewChanges={false}
            anchor={{ x: 0.5, y: 1 }}
            onPress={() => {
              const safe = { ...node, tags: node.tags ?? [] };
              setSelectedNode(safe);
            }}
          >
            {/* Placeholder bubble — replace the View+Text with an <Image> once
                you have custom icon assets per tag. */}
            <View style={[styles.tagMarkerBubble, { backgroundColor: config.color }]}>
              <Text style={styles.tagMarkerLabel}>{config.label[0]}</Text>
            </View>
            <View style={[styles.tagMarkerTail, { borderTopColor: config.color }]} />
          </Marker>
        );
      });
  }

  // -------------------------------------------------------------------------
  // Debug helpers (unchanged)
  // -------------------------------------------------------------------------
  function makeDataLines(graph: Graph) {
    let i = 0;
    const out = [];
    for (const edge of graph.edges) {
      if (edge.indoors) continue;
      out.push(
        <Polyline
          coordinates={[
            { latitude: edge.startNode.y, longitude: edge.startNode.x },
            { latitude: edge.endNode.y, longitude: edge.endNode.x },
          ]}
          strokeColor="#ff00c3"
          strokeWidth={5}
          lineCap="round"
          lineJoin="round"
          key={"edge" + (i++).toString()}
        />,
      );
    }
    return out;
  }

  // -------------------------------------------------------------------------
  // Map press → select closest named node
  // -------------------------------------------------------------------------
  function handleMapPress(e: any) {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    const closest = getClosestNode(latitude, longitude, graph);
    if (closest != null) {
      const selectedNodeSafe = {
        ...closest,
        tags: "tags" in closest ? closest.tags : [],
      };
      setSelectedNode(selectedNodeSafe);
    }
  }

  function getClosestNode(lat: number, lng: number, graph: Graph) {
    let bestNode = null;
    let bestDist = Infinity;
    for (const node of graph.nodes) {
      if (node.name?.startsWith("~")) continue;
      const dLat = lat - node.y;
      const dLng = lng - node.x;
      const dist = dLat * dLat + dLng * dLng;
      if (dist < bestDist) {
        bestDist = dist;
        bestNode = node;
      }
    }
    return bestNode;
  }

  function handleFeatureToggle() {
    panelOpen.value = !panelOpen.value;
    setIsPanelOpen(!isPanelOpen);
  }

  const BOUNDS = { north: 38.972, south: 38.941, east: -95.23, west: -95.286 };
  const clamp = (v: number, min: number, max: number) =>
    Math.min(max, Math.max(min, v));

  useEffect(() => {
    mapRef.current?.animateToRegion(KU, 900);
  }, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        mapType="hybrid"
        style={{ flex: 1 }}
        cameraZoomRange={{
          minCenterCoordinateDistance: 12,
          maxCenterCoordinateDistance: 7000,
        }}
        initialRegion={KU}
        showsUserLocation
        onPress={handleMapPress}
        onRegionChangeComplete={(r) => {
          const lat = clamp(r.latitude, BOUNDS.south, BOUNDS.north);
          const lng = clamp(r.longitude, BOUNDS.west, BOUNDS.east);
          if (lat !== r.latitude || lng !== r.longitude) {
            mapRef.current?.animateToRegion(
              { ...r, latitude: lat, longitude: lng },
              120,
            );
          }
        }}
      >
        {/* ── Tag markers ── */}
        {makeTagMarkers()}

        {/* ── Selected-node pin ── */}
        {selectedNode && (
          <Marker
            coordinate={{ latitude: selectedNode.y, longitude: selectedNode.x }}
          >
            <Image
              source={require("../../assets/images/icons/pin.png")}
              style={{ width: 45, height: 45 }}
              resizeMode="contain"
            />
          </Marker>
        )}

        {DEBUG &&
          graph.nodes.map((node) => (
            <Marker
              key={`node-${node.id}`}
              coordinate={{ latitude: node.y, longitude: node.x }}
              pinColor="blue"
              title={`${node.name} (${node.id})`}
            />
          ))}
        {DEBUG && makeDataLines(graph)}
      </MapView>

      {/* ── Bottom info card ── */}
      {selectedNode && (
        <View style={styles.mapOverlayCard}>
          <Text style={styles.nodeTitle}>{selectedNode.name}</Text>
          <View style={styles.featuresContainer}>
            <Text style={styles.featuresLabel}>Location Features:</Text>
            {selectedNode.tags && selectedNode.tags.length > 0 ? (
              selectedNode.tags.map((tag: string, index: number) => (
                <Text key={index} style={styles.tagText}>
                  • {tag.charAt(0).toUpperCase() + tag.slice(1)}
                </Text>
              ))
            ) : (
              <Text style={styles.tagText}>• No features listed</Text>
            )}
          </View>
          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.bubbleButton, styles.cancelButton]}
              onPress={() => setSelectedNode(null)}
            >
              <Text style={styles.buttonLabel}>CANCEL</Text>
            </Pressable>
            <Pressable
              style={[styles.bubbleButton, styles.goButton]}
              onPress={() => {
                dispatch(setDestination(selectedNode.name));
                navigate("/");
                setSelectedNode(null);
              }}
            >
              <Text style={styles.buttonLabel}>GO TO</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ── Filter toggle button ── */}
      {!isPanelOpen && (
        <Pressable style={styles.featureToggle} onPress={handleFeatureToggle}>
          <OptionsIcon height={42} width={42} />
        </Pressable>
      )}

      {/* ── Sliding filter panel ── */}
      <Animated.View
        style={[styles.sidePanel, { width: PANEL_WIDTH }, animatedPanelStyle]}
        pointerEvents="auto"
      >
        <FeatureFilter
          onClose={() => {
            panelOpen.value = false;
            setIsPanelOpen(false);
          }}
        />
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  tagMarkerBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  tagMarkerLabel: {
  fontSize: 18,
  fontWeight: "bold",
  color: "#fff",
},
  tagMarkerTail: {
    alignSelf: "center",
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },

  featureToggle: {
    position: "absolute",
    top: 100,
    right: 16,
    width: 84,
    height: 56,
    borderRadius: 38,
    backgroundColor: "#356EC4",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  sidePanel: {
    position: "absolute",
    top: 100,
    right: 0,
    backgroundColor: "white",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },
  mapOverlayCard: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
    paddingHorizontal: 30,
    paddingTop: 25,
    paddingBottom: 40,
    zIndex: 100,
  },
  buttonLabel: {
    fontFamily: "OrelegaOne",
    color: "#fff",
    fontSize: 18,
  },
  nodeTitle: {
    fontSize: 26,
    fontFamily: "OrelegaOne",
    color: "#356EC4",
    textAlign: "center",
    marginBottom: 15,
  },
  featuresContainer: {
    backgroundColor: "#C2DCF0",
    borderRadius: 20,
    padding: 15,
    marginBottom: 20,
  },
  featuresLabel: {
    fontFamily: "OrelegaOne",
    fontSize: 22,
    color: "#356EC4",
    marginBottom: 5,
  },
  tagText: {
    fontFamily: "OrelegaOne",
    fontSize: 22,
    color: "#356EC4",
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  bubbleButton: {
    flex: 1,
    height: 60,
    borderRadius: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButton: { backgroundColor: "#df010c" },
  goButton: { backgroundColor: "#356EC4" },
});