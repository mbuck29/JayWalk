/**
 * File: routing.tsx
 * Purpose: Specify the tab layout of the app
 * Author: Delaney G, C. Cooper, Blake J
 * Date Created: 2026-02-09
 * Date Modified: 2026-02-14
 */

import EndRoute from "@/components/ui/EndRoue";
import RouteSummary from "@/components/ui/RouteSummary";
import { Edge, Node } from "@/maps/graph";
import React, { useEffect, useRef } from "react";
import MapView, { Polyline } from "react-native-maps";
import { stringifyRoute } from "../Utils/routingUtils";
import { getRoute, getState } from "../Utils/state";

export default function TabTwoScreen() {
  const mapRef = useRef<MapView>(null);

  const state = getState(); // get the current state of app
  const currentRoute = getRoute(state); //get current route
  console.log("Current route in TabTwoScreen:", currentRoute ? stringifyRoute(currentRoute) : "[]"); // Log the current route for debugging

  const [isRouteStarted, setIsRouteStarted] = React.useState(false);

  //
  const halfWayIndex = currentRoute
    ? Math.floor(currentRoute.stops.length / 2)
    : 0;
  const routeOverview = {
    latitude: currentRoute ? currentRoute.stops[halfWayIndex].y : 0,
    longitude: currentRoute ? currentRoute.stops[halfWayIndex].x : 0,
    latitudeDelta: 0.001, // smaller = more zoomed in
    longitudeDelta: 0.004, // smaller = more zoomed in
  };

  // route for testing
  //const currentRoute = { stops: [graph.nodes[0], graph.nodes[1], graph.nodes[2]] };

  // CURRENT ROUTE DISPLAY - makes a line through stops
  function makeRoutePolyline(stops: Node[]) {
    if (!stops || stops.length < 2) return null; // return if route too short

    //each stop into coordinates
    const coords = stops.map((node: Node) => ({
      latitude: node.y,
      longitude: node.x,
    }));

    //displays route
    return (
      <Polyline
        coordinates={coords}
        strokeColor="#0066ff"
        strokeWidth={5}
        lineCap="round"
        lineJoin="round"
      />
    );
  }

  //Old fucntion
  // Make oulylines for our graph data
  function makeDataLines(edges: Edge[]) {
    let i = 0;

    let out = [];
    for (const edge of edges) {
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

    return out.length > 0 ? out : null;
  }

  // The bounds of where the map will go. These are a rough measurement. If the user
  // goes outside of these bounds, the map will bring them back in.
  const BOUNDS = { north: 38.972, south: 38.941, east: -95.23, west: -95.286 };
  const clamp = (v: number, min: number, max: number) =>
    Math.min(max, Math.max(min, v));

  useEffect(() => {
    // Optional “cool” zoom-in animation on mount
    mapRef.current?.animateToRegion(routeOverview, 900);
  }, []);

  return (
    <>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        cameraZoomRange={{
          // This is for limiting how far in and out the user can zoom. This might only work or apple users
          minCenterCoordinateDistance: 12,
          maxCenterCoordinateDistance: 7000,
        }}
        scrollEnabled={isRouteStarted} // Lock panning if not started
        zoomEnabled={isRouteStarted} // Lock zooming if not started
        initialRegion={routeOverview} // This places them over the campus on load
        showsUserLocation
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
        {currentRoute && makeRoutePolyline(currentRoute.stops)}
      </MapView>
      {!isRouteStarted && (
        <RouteSummary setIsRouteStarted={setIsRouteStarted} />
      )}
      {isRouteStarted && <EndRoute setIsRouteStarted={setIsRouteStarted} />}
    </>
  );
}
