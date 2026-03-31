/**
 * File: map.tsx
 * Purpose: The map tab of the app. Defines a map that the user can use to view the layout of campus.
 * Authors: Michael B, C. Cooper, Blake Jesse
 * Date Created: 2026-02-07
 * Date Modified: 2026-02-14
 */
import OptionsIcon from "@/assets/images/icons/options.svg";
import FeatureFilter from "@/components/ui/FeatureFilter";
import { graph, Graph } from "@/maps/graph";
import { setDestination, useAppDispatch } from "@/redux/appState";
import { navigate } from "expo-router/build/global-state/routing";
import React, { useEffect, useRef, useState } from "react";
import {
  Button,
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

export default function TabTwoScreen() {
  const mapRef = useRef<MapView>(null);
  const dispatch = useAppDispatch();
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const { width: screenWidth } = useWindowDimensions();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const PANEL_WIDTH = Math.min(screenWidth * 0.6, 320); //calculate the panel width based on the screen width, but dont let it be wider than 320 pxs

  // shared value for whether the side panel is open
  const panelOpen = useSharedValue(false);

  // This animated style will be applied to the side panel, and will cause it to slide in and out when the panelOpen value changes
  const animatedPanelStyle = useAnimatedStyle(() => {
    return {
      transform: [
        // translateX will be 0 when the panel is open, and PANEL_WIDTH when it is closed, causing it to slide in and out from the right */
        {
          translateX: withTiming(panelOpen.value ? 0 : PANEL_WIDTH, {
            duration: 250,
          }),
        },
      ],
      opacity: withTiming(panelOpen.value ? 1 : 0, {
        // fade in the panel when it opens, and fade out when it closes
        duration: 200,
      }),
    };
  });

  const KU = {
    latitude: 38.9541967,
    longitude: -95.2597806,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

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

  function handleMapPress(e: any) {
    const { latitude, longitude } = e.nativeEvent.coordinate;

    const closest = getClosestNode(latitude, longitude, graph);

    console.log("Tapped at:", latitude, longitude);

    if (closest != null) {
      console.log("Closest node:", {
        id: closest.id,
        name: closest.name,
        lat: closest.y,
        lng: closest.x,
      });
       const selectedNodeSafe = {
    ...closest,
    tags: "tags" in closest ? closest.tags : [], // only default if missing
  };

      setSelectedNode(selectedNodeSafe); // <-- only set state
    }
  }

  function getClosestNode(lat: number, lng: number, graph: Graph) {
    let bestNode = null;
    let bestDist = Infinity;

    for (const node of graph.nodes) {
      // Skip nodes whose name begins with "~"
      if (node.name?.startsWith("~")) continue;

      const dLat = lat - node.y;
      const dLng = lng - node.x;

      const dist = dLat * dLat + dLng * dLng; // squared distance

      if (dist < bestDist) {
        bestDist = dist;
        bestNode = node;
      }
    }
    return bestNode;
  }

  // This function toggles if the side panel is open or not. But also sets the state value so that the toggle button will hide.
  function handleFeatureToggle() {
    panelOpen.value = !panelOpen.value; // sets the shared value
    setIsPanelOpen(!isPanelOpen); // sets the state values
  }

  const BOUNDS = { north: 38.972, south: 38.941, east: -95.23, west: -95.286 };
  const clamp = (v: number, min: number, max: number) =>
    Math.min(max, Math.max(min, v));

  useEffect(() => {
    mapRef.current?.animateToRegion(KU, 900);
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        mapType="hybrid"
        style={{ flex: 1 }}
        cameraZoomRange={{
          // This is for limiting how far in and out the user can zoom. This might only work or apple users
          minCenterCoordinateDistance: 12,
          maxCenterCoordinateDistance: 7000,
        }}
        initialRegion={KU} // This places them over the campus on load
        showsUserLocation // This shows the user’s location as a blue dot on the map
        onPress={handleMapPress}
        // This is a callback that is called when the user moves the map. We use it to clamp the map to the bounds of the campus, so that they dont get lost.
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
        {selectedNode && (
          <Marker
            coordinate={{
              latitude: selectedNode.y,
              longitude: selectedNode.x,
            }}
            title={selectedNode.name}
            pinColor="red"
          />
        )}
      </MapView>

      {selectedNode && (
        <View
          style={{
            position: "absolute",
            bottom: 40,
            left: 20,
            right: 20,
            backgroundColor: "white",
            padding: 12,
            borderRadius: 10,
          }}
        >
          <Text style={{ textAlign: "center" }}>
            Lat: {selectedNode.y.toFixed(6)} Lng: {selectedNode.x.toFixed(6)}
          </Text>
          <Text style={{ textAlign: "center", marginTop: 4 }}> Tags: {selectedNode.tags?.join(", ") || "None"}</Text>
          <Button
            title={`Go to ${selectedNode.name}`}
            onPress={() => {
              dispatch(setDestination(selectedNode.name));
              navigate("/");
              setSelectedNode(null);
            }}
          />
          <Button title="Cancel" onPress={() => setSelectedNode(null)} />
        </View>
      )}

      {/* Toggle button */}
      {!isPanelOpen && (
        <Pressable style={styles.featureToggle} onPress={handleFeatureToggle}>
          <OptionsIcon height={42} width={42} />
        </Pressable>
      )}

      {/* Sliding side panel */}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
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
});
