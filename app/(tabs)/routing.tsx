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

const BACK_WINDOW = 1; // allow recovery 1 stop behind
const FORWARD_WINDOW = 3; // allow catch-up up to 3 stops ahead
const NEAR_METERS = 14; // “you are at this stop”
const SWITCH_HYST = 8; // must be this many meters closer than current stop
const CONFIRM_HITS = 2; // consecutive confirmations
const MAX_ACC = 50; // ignore worse accuracy than this
const MAX_FORWARD_JUMP = 2; // prevent huge skips unless extremely near
const SUPER_NEAR = 6; // allow bigger jump if you're REALLY close

export default function TabTwoScreen() {
  const mapRef = useRef<MapView>(null);
  const dispatch = useAppDispatch();
  const state = useAppSelector((state) => state.jayWalk);
  const currentRoute = getRoute(state); //get current route
  console.log("Current route", currentRoute);
  console.log("all stops", currentRoute?.stops);

  const [isRouteStarted, setIsRouteStarted] = useState(false); // a way to know if we should show componenets that are part of the route taking experince
  const [isLockedOnUser, setIsLockedOnUser] = useState(true); // a way to know if we are "following" the user
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );
  const [locationPermissionStatus, requestLocationPermissions] =
    Location.useForegroundPermissions();
  const currentNode = useAppSelector((state) => state.jayWalk.currentNode);
  const safeIndoors =
    currentRoute?.stops?.[currentNode]?.building !== undefined;
  const [isCurrNodeInDoors, setIsCurrNodeInDoors] =
    useState<boolean>(safeIndoors);
  const [mapReady, setMapReady] = useState(false);

  // Simple boolean to represent if we have the users location
  const hasFix =
    (location?.coords?.latitude ?? 0) !== 0 &&
    (location?.coords?.longitude ?? 0) !== 0;

  const candidateRef = useRef<number | null>(null);
  const hitsRef = useRef(0);
  const lastSetAtRef = useRef(0);

  useEffect(() => {
    if (!isRouteStarted) return; // only track location and advance if the route has started
    if (!location) return; // need location to do anything
    if (!currentRoute) return; // need a route to do anything

    // Determine indoor/outdoor based on the stop itself, since outdoor stops have real GPS coords
    // and indoor stops use indoor-map coordinates
    const isCurrNodeInDoors =
      currentRoute?.stops?.[currentNode]?.building !== undefined;
    if (isCurrNodeInDoors) return; // only track outdoors here

    const now = Date.now();
    if (now - lastSetAtRef.current < 800) return; // small cooldown between polling the locaiton

    // Grab the users gps accuracy to see if its to bad to use
    const acc = location.coords.accuracy ?? 999;
    if (acc > MAX_ACC) return;

    // Get the users cordiantes
    const { latitude: userLat, longitude: userLng } = location.coords;

    const n = currentRoute.stops.length;
    if (!n) return; // Small check to make sure we are doing operations on an empty list

    // -------- Transition cooldown (prevents big jumps right after indoor->outdoor flips) --------
    // If we *just* flipped to outdoors, be conservative for a few seconds.
    // (This prevents "press next -> go outside -> GPS jumps 6 nodes ahead".)
    const TRANSITION_COOLDOWN_MS = 3500;
    const prevIndoorsRef = (TabTwoScreen as any)._prevIndoorsRef ?? {
      current: isCurrNodeInDoors,
    };
    const lastFlipAtRef = (TabTwoScreen as any)._lastFlipAtRef ?? {
      current: 0,
    };
    (TabTwoScreen as any)._prevIndoorsRef = prevIndoorsRef;
    (TabTwoScreen as any)._lastFlipAtRef = lastFlipAtRef;

    if (prevIndoorsRef.current !== isCurrNodeInDoors) {
      lastFlipAtRef.current = now;
      prevIndoorsRef.current = isCurrNodeInDoors;
    }

    const inCooldown = now - lastFlipAtRef.current < TRANSITION_COOLDOWN_MS;

    // We have set windows oh which wwe will compare
    const start = Math.max(0, currentNode - BACK_WINDOW);
    const end = Math.min(
      n - 1,
      currentNode + (inCooldown ? 1 : FORWARD_WINDOW),
    );

    // Grab the currenet stop and if we have it then we will see the distance between the user
    // and the current stop. Only use it if it is actually an outdoor stop with valid GPS coords.
    const curStop =
      currentRoute.stops[currentNode]?.building === undefined
        ? currentRoute.stops[currentNode]
        : null;

    const curDist = curStop
      ? haversineMeters(userLat, userLng, curStop.y, curStop.x)
      : Number.POSITIVE_INFINITY;

    // Initalize a best index and best distance as the current node so we can use it to comapre
    // against the other nodes
    let bestIdx = currentNode;
    let bestDist = curDist;

    // Loop through the allowable stops that can be jumped to from the current stop based on the forward
    // and backward windows. For each one use its cordinates and get its distance from the users location.
    // IMPORTANT: only consider OUTDOOR stops while outdoors
    for (let i = start; i <= end; i++) {
      const isIndoorCandidate = currentRoute.stops[i]?.building !== undefined;
      if (isIndoorCandidate) continue;

      const s = currentRoute.stops[i];
      const d = haversineMeters(userLat, userLng, s.y, s.x);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }

    // This checks if the best is actually within range to jump to
    const isNearBest = bestDist <= NEAR_METERS;

    // This keeps it from flipping back and forth between two nodes, that is it needs to be clearly better than the
    // current node
    const isClearlyBetter = bestDist + SWITCH_HYST < curDist;

    if (!isNearBest && !isClearlyBetter) {
      // no strong evidence, reset candidate/hits
      candidateRef.current = null;
      hitsRef.current = 0;
      return;
    }

    // This prevents big forward skips unless we are really sure and really close to that node
    const delta = bestIdx - currentNode;
    const maxJumpNow = inCooldown ? 1 : MAX_FORWARD_JUMP;
    if (delta > maxJumpNow && bestDist > SUPER_NEAR) {
      return;
    }

    // Increment the hits ref if we got the same index twice
    if (candidateRef.current === bestIdx) {
      hitsRef.current += 1;
    } else {
      // If we got a new best then start the count for that
      candidateRef.current = bestIdx;
      hitsRef.current = 1;
    }

    // If the amount of hits for a node has passed the threshold needed and its not the current node
    // then we want to set that as the current node, even if its backwards or forwards more than one
    // As well as reset all the refs
    if (hitsRef.current >= CONFIRM_HITS && bestIdx !== currentNode) {
      // -------- Doorway snap logic (outdoors -> indoors) --------
      // Find the next indoor stop after our chosen outdoor bestIdx.
      // Only snap inside if we are *actually near the outdoor doorway stop*.
      let nextIndoorIdx = -1;
      for (let j = bestIdx + 1; j < n; j++) {
        if (currentRoute.stops[j]?.building !== undefined) {
          nextIndoorIdx = j;
          break;
        }
        // stop scanning once we find the first indoor stop after this outdoor run
      }

      if (nextIndoorIdx !== -1) {
        const doorwayIdx = nextIndoorIdx - 1; // last outdoor stop before going indoors
        const doorwayIsOutdoor =
          doorwayIdx >= 0 &&
          currentRoute.stops[doorwayIdx]?.building === undefined;

        if (doorwayIsOutdoor) {
          const doorStop = currentRoute.stops[doorwayIdx];
          const distToDoor = haversineMeters(
            userLat,
            userLng,
            doorStop.y,
            doorStop.x,
          );

          // Only snap indoors when we're actually at the doorway outdoor stop
          if (distToDoor <= NEAR_METERS) {
            dispatch(setCurrentNode(nextIndoorIdx));
            lastSetAtRef.current = now;
            candidateRef.current = null;
            hitsRef.current = 0;
            return;
          }
        }
      }

      // normal advance to best candidate
      dispatch(setCurrentNode(bestIdx));

      // After either of those outcomes we want to reset everything
      lastSetAtRef.current = now;
      candidateRef.current = null;
      hitsRef.current = 0;
    }
  }, [location, isRouteStarted, currentRoute, currentNode]);

  // Update whether we're indoors or outdoors whenever we change nodes or routes
  useEffect(() => {
    setIsCurrNodeInDoors(
      currentRoute?.stops?.[currentNode]?.building !== undefined,
    );
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
    if (!mapReady) return; //
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
    <View style={{ flex: 1 }}>
      {/* MAP LAYER (always mounted so tiles stay cached) */}
      <View
        style={[
          StyleSheet.absoluteFillObject,
          { display: isCurrNodeInDoors ? "none" : "flex" },
        ]}
        pointerEvents={isCurrNodeInDoors ? "none" : "auto"}
      >
        {/* if we're outdoors, show the map */}
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
            onMapReady={() => setMapReady(true)}
            mapType={mapReady ? "satellite" : "standard"}
            cameraZoomRange={{
              // This is for limiting how far in and out the user can zoom. This might only work or apple users
              minCenterCoordinateDistance: 12,
              maxCenterCoordinateDistance: 7000,
            }}
            pitchEnabled={isRouteStarted} // lock changing the pitch till they start the route
            rotateEnabled={isRouteStarted} // lock rotating till they start
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
      </View>
      {/* INDOOR LAYER */}
      <View
        style={[
          StyleSheet.absoluteFillObject,
          { display: isCurrNodeInDoors ? "flex" : "none" },
        ]}
        pointerEvents={isCurrNodeInDoors ? "auto" : "none"}
      >
        {/* if we're indoors, show the indoor nav screen instead of the map */}
        <IndoorNav
          instrList={currentRoute?.directions ?? []}
          setIsRouteStarted={setIsRouteStarted}
        />
      </View>
      {/* Want to show a summary of the route before they choose to start it, this can show on both outside and inside */}
      {!isRouteStarted && (
        <RouteSummary
          setIsRouteStarted={setIsRouteStarted}
          routeLength={currentRoute?.length ?? 0}
          startingLocation={currentRoute?.stops[0]?.name}
          endingLocation={
            currentRoute?.stops[currentRoute.stops.length - 1]?.name
          }
        />
      )}
      {/* only show end route button if we're outdoors, since indoors we have the end route button in the indoor nav screen */}
      {isRouteStarted && !isCurrNodeInDoors && (
        <EndRoute setIsRouteStarted={setIsRouteStarted} />
      )}
      {/* only show lock on user button if we're outdoors and the route has started */}
      {!isLockedOnUser && !isCurrNodeInDoors && isRouteStarted && (
        <LockOnUser setIsLockedOnUser={setIsLockedOnUser} />
      )}
    </View>
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
