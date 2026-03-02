/**
 * File: routing.tsx
 * Purpose: Specify the tab layout of the app
 * Author: Delaney G, C. Cooper, Blake J, Michael B
 * Date Created: 2026-02-09
 * Date Modified: 2026-02-14
 */

import EndRoute from "@/components/ui/EndRoute";
import IndoorNav from "@/components/ui/IndoorNav";
import LockOnUser from "@/components/ui/lockOnUser";
import RouteSummary from "@/components/ui/RouteSummary";
import { Node } from "@/maps/graph";
import {
  setCurrentNode,
  useAppDispatch,
  useAppSelector,
} from "@/redux/appState";
import * as Location from "expo-location";
import { navigate } from "expo-router/build/global-state/routing";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Polyline } from "react-native-maps";
import { watchLocation } from "../Utils/location";
import { Route } from "../Utils/routing";
import { haversineMeters } from "../Utils/routingUtils";
import { getRoute } from "../Utils/state";

const NEAR_STOP_METERS = 15; // tweak 10–25
const CONFIRM_HITS = 2; // consecutive updates needed

export default function TabTwoScreen() {
  const mapRef = useRef<MapView>(null);
  const dispatch = useAppDispatch();
  const state = useAppSelector((state) => state.jayWalk);
  const currentRoute = getRoute(state); //get current route

  const [isRouteStarted, setIsRouteStarted] = useState(false); // a way to know if we should show componenets that are part of the route taking experince
  const [isLockedOnUser, setIsLockedOnUser] = useState(true); // a way to know if we are "following" the user
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );
  const [locationPermissionStatus, requestLocationPermissions] =
    Location.useForegroundPermissions();
  const currentNode = useAppSelector((state) => state.jayWalk.currentNode);
  const safeIndoors = !!currentRoute?.route?.[currentNode]?.indoors;
  const [isCurrNodeInDoors, setIsCurrNodeInDoors] =
    useState<boolean>(safeIndoors);

  // Simple boolean to represent if we have the users location
  const hasFix =
    (location?.coords?.latitude ?? 0) !== 0 &&
    (location?.coords?.longitude ?? 0) !== 0;

  const nearHitsRef = useRef(0); // Will use to track if we have gotten enough hits in a row to update current node
  const lastAdvanceAtRef = useRef(0); // track the users last known locatoin

  useEffect(() => {
    if (!isRouteStarted) return; // only track location and advance if the route has started
    if (!location) return; // need location to do anything
    if (!currentRoute) return; // need a route to do anything
    if (isCurrNodeInDoors) return; // only track outdoors here

    const now = Date.now();

    // small cooldown so you can't advance twice in the same second from GPS jitter
    if (now - lastAdvanceAtRef.current < 1000) return;

    // Grab the next possible node if it exists
    const nextIdx = currentNode + 1;
    if (nextIdx >= currentRoute.stops.length) return;

    const userLat = location.coords.latitude;
    const userLng = location.coords.longitude;

    const nextStop = currentRoute.stops[nextIdx]; // Get the next node
    const distToNext = haversineMeters(
      // Use our util function to get the difference
      userLat,
      userLng,
      nextStop.y,
      nextStop.x,
    );

    // ignore very inaccurate readings
    // (Expo Location gives accuracy in meters; smaller is better)
    const acc = location.coords.accuracy ?? 999;
    if (acc > 40) return;

    // if we're within the threshold distance to the next stop, count a "hit"
    if (distToNext <= NEAR_STOP_METERS) {
      nearHitsRef.current += 1;
      if (nearHitsRef.current >= CONFIRM_HITS) {
        // if we've had enough hits in a row, advance to the next stop
        // Advance index to next node
        dispatch(setCurrentNode(nextIdx));

        // Reset hit count and update last advance time
        nearHitsRef.current = 0;
        lastAdvanceAtRef.current = now;
      }
    } else {
      nearHitsRef.current = 0; // reset hit count if we move away from the stop
    }
  }, [location, isRouteStarted, currentRoute, currentNode, isCurrNodeInDoors]);

  // Update whether we're indoors or outdoors whenever we change nodes or routes
  useEffect(() => {
    setIsCurrNodeInDoors(!!currentRoute?.route?.[currentNode]?.indoors);
    console.log("currentNode", currentRoute?.stops[currentNode]);
    console.log("isCurrNodeInDoors", isCurrNodeInDoors);
  }, [currentNode, currentRoute]);

  // Request location permissions on mount and set up location tracking if granted
  function hasLocationPermissions(): boolean {
    return locationPermissionStatus?.granted ?? false;
  }
  useEffect(() => {
    // Request location permissions on mount and set up location tracking if granted
    if (!hasLocationPermissions()) {
      requestLocationPermissions();
    }

    // If we have location permissions, add a watcher for when they move
    if (hasLocationPermissions()) {
      watchLocation(setLocation, (errorReason) =>
        console.log("Location error: " + errorReason),
      );
    }
  }, [locationPermissionStatus]);

  // If we don't have a route, send them back to the home screen to make one
  useEffect(() => {
    if (!currentRoute) {
      navigate("/(tabs)");
      return; // Ensures nothing else runs
    }
  }, [currentRoute]);

  const halfWayIndex = currentRoute
    ? Math.floor(currentRoute.stops.length / 2)
    : 0;
  const routeOverview = {
    latitude: currentRoute ? currentRoute.stops[halfWayIndex].y - 0.0005 : 0, // Subtract .0008 so that the route Summary isnt blocking the route
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
        key={stops[0].name}
      />
    );
  }

  function makeRoutePolylines(route: Route) {
    const polylines = [];

    let base = 0;

    for (let i = 1; i < route.stops.length; i++) {
      if (!route.route[i - 1].indoors) {
        if (base < 0) {
          base = i - 1;
        }

        continue;
      }

      if (base != i - 1) {
        polylines.push(makeRoutePolyline(route.stops.slice(base, i)));
      }

      base = -1;
    }

    if (base >= 0 && base != route.stops.length - 2) {
      polylines.push(
        makeRoutePolyline(route.stops.slice(base, route.stops.length)),
      );
    }

    return polylines.length > 0 ? polylines : null;
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

  // If we're locked on the user and the route has started and we have a location fix, keep the map centered on them
  useEffect(() => {
    if (!isLockedOnUser) return; // only auto-center if we're locked on the user
    if (!isRouteStarted) return; // only auto-center if the route has started
    if (!hasFix) return; // only auto-center if we have a location fix

    // Animate the map to the user's current location with a nice zoom level for walking
    mapRef.current?.animateToRegion(
      {
        latitude: location!.coords.latitude,
        longitude: location!.coords.longitude,
        latitudeDelta: 0.0008,
        longitudeDelta: 0.0016,
      },
      300, // animation duration in ms
    );
  }, [location, isLockedOnUser, isRouteStarted, hasFix]);

  return (
    <>
      {isCurrNodeInDoors ? ( // if we're indoors, show the indoor nav screen instead of the map
        <IndoorNav
          instrList={currentRoute?.directions ?? []}
          setIsRouteStarted={setIsRouteStarted}
        />
      ) : (
        // if we're outdoors, show the map
        <>
          {isRouteStarted && (
            <View style={styles.instructionBar}>
              {currentRoute?.directions[currentNode] ? (
                <Text style={styles.instructionText}>
                  {currentRoute.directions[currentNode].direction}
                </Text>
              ) : (
                <></>
              )}
            </View>
          )}
          <MapView
            ref={mapRef}
            style={{ flex: 1 }}
            mapType="satellite"
            cameraZoomRange={{
              // This is for limiting how far in and out the user can zoom. This might only work or apple users
              minCenterCoordinateDistance: 12,
              maxCenterCoordinateDistance: 7000,
            }}
            scrollEnabled={isRouteStarted} // Lock panning if not started
            zoomEnabled={isRouteStarted} // Lock zooming if not started
            initialRegion={routeOverview} // This places them over the campus on load
            showsUserLocation // This shows the user’s location as a blue dot on the map
            onPanDrag={() => {
              // If the user manually moves the map, we unlock the "lock on user" mode so they can explore the map freely. They can always re-enable lock on user with the button.
              if (isLockedOnUser) setIsLockedOnUser(false);
            }}
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
            {currentRoute && makeRoutePolylines(currentRoute)}
            {/* Draw the route polylines on the map */}
          </MapView>
        </>
      )}
      {!isRouteStarted && ( // Want to show a summary of the route before they choose to start it, this can show on both outside and inside
        <RouteSummary
          setIsRouteStarted={setIsRouteStarted}
          routeLength={currentRoute?.length ?? 0}
          startingLocation={currentRoute?.stops[0]?.name}
          endingLocation={
            currentRoute?.stops[currentRoute.stops.length - 1]?.name
          }
        />
      )}
      {isRouteStarted &&
        !isCurrNodeInDoors && ( // only show end route button if we're outdoors, since indoors we have the end route button in the indoor nav screen
          <EndRoute setIsRouteStarted={setIsRouteStarted} />
        )}
      {!isLockedOnUser &&
        !isCurrNodeInDoors &&
        isRouteStarted && ( // only show lock on user button if we're outdoors and the route has started
          <LockOnUser setIsLockedOnUser={setIsLockedOnUser} />
        )}
    </>
  );
}

const styles = StyleSheet.create({
  instructionBar: {
    position: "absolute",
    top: 50,
    alignSelf: "center",
    backgroundColor: "#356EC4",
    padding: 10,
    borderRadius: 40,
    marginTop: 10,
    width: "90%",
    height: "8%",
    zIndex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  instructionText: {
    fontSize: 18,
    fontFamily: "Orelega One",
    color: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
});
