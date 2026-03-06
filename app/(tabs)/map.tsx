/**
 * File: map.tsx
 * Purpose: The map tab of the app. Defines a map that the user can use to view the layout of campus.
 * Authors: Michael B, C. Cooper, Blake Jesse
 * Date Created: 2026-02-07
 * Date Modified: 2026-02-14
 */
import { graph, Graph } from "@/maps/graph";
import { setDestination, useAppDispatch } from "@/redux/appState";
import { navigate } from "expo-router/build/global-state/routing";
import React, { useEffect, useRef } from "react";
import MapView, { Marker, Polyline } from "react-native-maps";

const DEBUG = false;

export default function TabTwoScreen() {
  const mapRef = useRef<MapView>(null);
  const dispatch = useAppDispatch();
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
      if(edge.indoors)
      {
        continue;
      }

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
  dispatch(setDestination(closest.name));
  navigate("/");
  };
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
      
      {/*can be uncommented to drop markers at all nodes to make it easier to see map layout  */}
      {DEBUG && graph.nodes.map((node) => (
        <Marker
          key={`node-${node.id}`}
          coordinate={{ latitude: node.y, longitude: node.x }}
          pinColor="blue"
          title={`${node.name} (${node.id})`}
        />
      ))}
      {/* This displays the lines of the graph that we have collected data for */}
      {DEBUG && makeDataLines(graph)}
           {/*can be uncommented to drop markers at all nodes to make it easier to see map layout  */}
      {/*graph.nodes.map((node) => (
        <Marker
          key={`node-${node.id}`}
          coordinate={{ latitude: node.y, longitude: node.x }}
          pinColor="blue"
          title={`Node ID: ${node.id}`}
        />
      ))*/} 
    </MapView>
  );
}
