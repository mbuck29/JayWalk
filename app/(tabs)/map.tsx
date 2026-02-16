/**
 * File: map.tsx
 * Purpose: The map tab of the app. Defines a map that the user can use to view the layout of campus.
 * Authors: Michael B, C. Cooper
 * Date Created: 2026-02-07
 * Date Modified: 2026-02-14
 */
import { graph, Graph } from "@/maps/graph";
import React, { useEffect, useRef } from "react";
import MapView, { Marker, Polyline } from "react-native-maps";

export default function TabTwoScreen() {
  const mapRef = useRef<MapView>(null);
  const KU = {
    latitude: 38.9541967,
    longitude: -95.2597806,
    latitudeDelta: 0.01, // smaller = more zoomed in
    longitudeDelta: 0.01,
  };

  // Make oulylines for our graph data
  function makeDataLines(graph: Graph) {
    let i = 0;

    // Add a Polyline for each edge of the graph
    let out = [];
    for (const edge of graph.edges) {
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

  // The bounds of where the map will go. These are a rough measurement. If the user
  // goes outside of these bounds, the map will bring them back in.
  const BOUNDS = { north: 38.972, south: 38.941, east: -95.23, west: -95.286 };
  const clamp = (v: number, min: number, max: number) =>
    Math.min(max, Math.max(min, v));

  useEffect(() => {
    // Optional “cool” zoom-in animation on mount
    mapRef.current?.animateToRegion(KU, 900);
  }, []);

  return (
    <MapView
      ref={mapRef}
      style={{ flex: 1 }}
      initialRegion={KU} // This places them over the campus on load
      showsUserLocation // This shows the user’s location as a blue dot on the map
      // This is a callback that is called when the user moves the map. We use it to clamp the map to the bounds of the campus, so that they dont get lost.
      onRegionChangeComplete={(r) => {
        const lat = clamp(r.latitude, BOUNDS.south, BOUNDS.north);
        const lng = clamp(r.longitude, BOUNDS.west, BOUNDS.east);

        // If the user has moved outside of the bounds, we animate the map back to the clamped position. This creates a sort of
        // “rubber band” effect when they try to move outside of the bounds.
        if (lat !== r.latitude || lng !== r.longitude) {
          mapRef.current?.animateToRegion(
            { ...r, latitude: lat, longitude: lng },
            120,
          );
        }
      }}
    >
      {/*These are markers that are then placed on the map, we can put them at any lat long and we can label them anything */}
      <Marker
        coordinate={{ latitude: KU.latitude, longitude: KU.longitude }}
        title="KU Campus"
      />
      <Marker
        coordinate={{ latitude: 38.957419, longitude: -95.253358 }}
        title="Engineering Campus"
      />
      {/* This displays the lines of the graph that we have collected data for */}
      {makeDataLines(graph)}
    </MapView>
  );
}
