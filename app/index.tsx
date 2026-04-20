/**
 * File: index.tsx
 * Purpose: The main tab of the app. Defines a map that the user can use to view the layout of campus.
 * Authors: Michael B, C. Cooper, Blake Jesse, Cole Charpentier, Delaney G
 * Date Created: 2026-02-07
 * Date Modified: 2026-04-12
 */
import Burger from "@/assets/images/icons/Misc/burger.svg";
import Reroute from "@/assets/images/icons/reroute.svg";
import EndRoute from "@/components/ui/EndRoute";
import IndoorNav from "@/components/ui/IndoorNav";
import LockOnUser from "@/components/ui/lockOnUser";
import ReroutePrompt from "@/components/ui/ReroutePrompt";
import RoutePolyline from "@/components/ui/RoutePolyline";
import RouteSummary from "@/components/ui/RouteSummary";
import SearchHeader from "@/components/ui/SearchHeader";
import TagMarker from "@/components/ui/TagMarker";
import { Tag } from "@/maps/data";
import { graph, Graph, Node } from "@/maps/graph";
import {
  clearRoute,
  setCurrentNode,
  setDestination,
  setRoute,
  setStart,
  useAppDispatch,
  useAppSelector,
} from "@/redux/appState";
import { Asset } from "expo-asset";
import { BlurView } from "expo-blur";
import { useFonts } from "expo-font";
import * as Location from "expo-location";
import { default as React, useEffect, useRef, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import MapView, { Marker, Polyline } from "react-native-maps";
import Animated, {
  FadeInDown,
  FadeOutDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { watchLocation } from "./Utils/location";
import { route } from "./Utils/routing";
import {
  calculateRouteTime,
  haversineMeters,
  remainingRouteMeters,
  sanitize,
} from "./Utils/routingUtils";
import { getRoute } from "./Utils/state";

const DEBUG = false;

const DEBUG_SPOOF = false;

const BACK_WINDOW = 1; // allow recovery 1 stop behind
const FORWARD_WINDOW = 3; // allow catch-up up to 3 stops ahead
const NEAR_METERS = 14; // “you are at this stop”
const SWITCH_HYST = 8; // must be this many meters closer than current stop
const CONFIRM_HITS = 2; // consecutive confirmations
const MAX_ACC = 50; // ignore worse accuracy than this
const MAX_FORWARD_JUMP = 2; // prevent huge skips unless extremely near
const SUPER_NEAR = 6; // allow bigger jump if you're REALLY close

// Tag → display config
const TAG_CONFIG: Record<Tag, { emoji: string; color: string; label: string }> =
  {
    bathrooms: { emoji: "🚻", color: "#4A90D9", label: "Restroom" },
    printers: { emoji: "🖨️", color: "#7B68EE", label: "Printers" },
    "bus stop": { emoji: "🚌", color: "#E8A020", label: "Bus Stop" },
    food: { emoji: "🍽️", color: "#E05C3A", label: "Food" },
    computers: { emoji: "💻", color: "#3AAE6E", label: "Computers" },
  };

// Priority order — first matching tag wins for the marker icon
const TAG_PRIORITY: Tag[] = [
  "food",
  "bus stop",
  "bathrooms",
  "printers",
  "computers",
];

// Map FeatureFilter display strings -> Tag values used in node data.
// "Study Area" has no matching Tag yet, so it is intentionally omitted.
const FEATURE_TO_TAG: Record<string, Tag> = {
  "Private Restrooms": "bathrooms",
  Printers: "printers",
  Food: "food",
  Computers: "computers",
  "Bus Stop": "bus stop",
};

// The bounds of where the map will go. These are a rough measurement. If the user
// goes outside of these bounds, the map will bring them back in.
const BOUNDS = { north: 38.972, south: 38.941, east: -95.23, west: -95.286 };

// Outline of the KU campus
const KU = {
  latitude: 38.9541967,
  longitude: -95.2597806,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

// Variables for what percent of the screen the bottom pane offsets by at various positions
const BOTTOM_OFFSET_HIGH_HIGH = -0.55;
const BOTTOM_OFFSET_HIGH = -0.27;
const BOTTOM_OFFSET_LOW = 0.5;

export default function TabTwoScreen() {
  const dispatch = useAppDispatch();

  // STATE VARIABLES
  const state = useAppSelector((state) => state.jayWalk);
  const currentNode = state.currentNode;
  const currentRoute = getRoute(state); //get current route
  const hasRoute = currentRoute != null;
  const halfWayIndex = hasRoute ? Math.floor(currentRoute.stops.length / 2) : 0;
  const safeIndoors =
    currentRoute?.stops?.[currentNode]?.building !== undefined;
  const selectedFeatures = state.selectedFeatures; // Read the filter selections that FeatureFilter already manages in Redux.
  // Derive the active tag set reactively — no separate local state needed.
  const activeTags = new Set<Tag>(
    selectedFeatures
      .map((f) => FEATURE_TO_TAG[f])
      .filter((t): t is Tag => t !== undefined),
  );

  const routeOverview = {
    latitude: currentRoute ? currentRoute.stops[halfWayIndex].y - 0.0005 : 0, // Subtract .0005 so that the route Summary isnt blocking the route
    longitude: currentRoute ? currentRoute.stops[halfWayIndex].x : 0,
    latitudeDelta: 0.001, // smaller = more zoomed in
    longitudeDelta: 0.004, // smaller = more zoomed in
  };

  // COMPONENT REF VARIABLES
  const mapRef = useRef<MapView>(null);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const PANEL_WIDTH = Math.min(screenWidth * 0.6, 320);

  // INTERNAL STATE VARIABLES
  const [routeStatus, setRouteStatus] = useState<
    "not started" | "previewing" | "started"
  >("not started");
  const routeNotStarted = routeStatus == "not started";
  const routeStarted = routeStatus == "started" && hasRoute;
  const isPreviewingRoute = routeStatus == "previewing";
  const [isLockedOnUser, setIsLockedOnUser] = useState(true); // a way to know if we are "following" the user
  const [locationPermissionStatus, requestLocationPermissions] =
    Location.useForegroundPermissions();
  const [isCurrNodeInDoors, setIsCurrNodeInDoors] =
    useState<boolean>(safeIndoors);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [showReroutePrompt, setShowReroutePrompt] = useState(false);
  const [isManualReroute, setIsManualReroute] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );
  const [currLocation, setCurrLocation] = useState<Node | null>(null); // These are used as start and stop for routing.
  const [destLocations, setDestLocations] = useState<Node[]>([]);
  const hasFix =
    (location?.coords?.latitude ?? 0) !== 0 &&
    (location?.coords?.longitude ?? 0) !== 0; // Simple boolean to represent if we have the users location

  // UI STATE VARIABLES
  const [bottomPanePosition, setBottomPanePosition] = useState<
    "hamburger" | "mid" | "high"
  >("mid");
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // TODO: Figure out how to detect this (Michael knows)
  const darkLightMode: "dark" | "light" = "light";

  // FILTER PANEL ANIMATION VARIABLES
  const panelOpen = useSharedValue(false);

  const animatedPanelStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: withTiming(panelOpen.value ? 0 : PANEL_WIDTH, {
          duration: 250,
        }),
      },
    ],
    opacity: withTiming(panelOpen.value ? 1 : 0, { duration: 200 }),
  }));

  // BOTTOM PANE ANIMATION VARIABLES
  const bottomPaneOffset = useSharedValue<number>(0);
  const [bottomPaneContentIsScrolled, setBottomPaneContentIsScrolled] =
    useState(false);

  const bottomPaneAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: bottomPaneOffset.value,
        },
      ],
    };
  });

  const bottomPanePan = Gesture.Pan()
    .onChange((event) => {
      const baseTarget =
        bottomPanePosition == "mid"
          ? 0
          : bottomPanePosition == "high"
            ? BOTTOM_OFFSET_HIGH * screenHeight
            : BOTTOM_OFFSET_LOW * screenHeight;
      bottomPaneOffset.value = baseTarget + event.translationY;
      if (bottomPaneOffset.value > BOTTOM_OFFSET_LOW * screenHeight) {
        bottomPaneOffset.value = BOTTOM_OFFSET_LOW * screenHeight;
      } else if (
        bottomPaneOffset.value <
        BOTTOM_OFFSET_HIGH_HIGH * screenHeight
      ) {
        bottomPaneOffset.value = BOTTOM_OFFSET_HIGH_HIGH * screenHeight;
      }
    })
    .onFinalize((event) => {
      const baseTarget =
        bottomPanePosition == "mid"
          ? 0
          : bottomPanePosition == "high"
            ? BOTTOM_OFFSET_HIGH * screenHeight
            : BOTTOM_OFFSET_LOW * screenHeight;
      let newPosition = bottomPanePosition;
      if (Math.abs(event.translationY) > 0.07 * screenHeight) {
        const down = event.translationY > 0;
        if (bottomPanePosition == "high" && down) {
          newPosition =
            event.translationY > 0.4 * screenHeight ? "hamburger" : "mid";
        } else if (bottomPanePosition == "mid") {
          newPosition = down ? "hamburger" : "high";
        } else if (bottomPanePosition == "hamburger" && !down) {
          newPosition =
            event.translationY < -0.7 * screenHeight ? "high" : "mid";
        }
      }

      const newTarget =
        newPosition == "mid"
          ? 0
          : newPosition == "high"
            ? BOTTOM_OFFSET_HIGH * screenHeight
            : BOTTOM_OFFSET_LOW * screenHeight;
      bottomPaneOffset.value = withTiming(newTarget, {
        duration:
          100 +
          (500 * Math.abs(newTarget - baseTarget - event.translationY)) /
            screenHeight,
      });
      scheduleOnRN(setBottomPanePosition, newPosition);
    });

  // FONT VARIABLE
  const [fontsLoaded] = useFonts({
    "MuseoModerno-Bold": require("../assets/fonts/MuseoModerno-Bold.ttf"),
    OrelegaOne: require("../assets/fonts/OrelegaOne-Regular.ttf"),
  });

  useEffect(() => {
    //load custom marker
    Asset.fromModule(require("../assets/images/icons/pin.png")).downloadAsync();
  }, []);

  // These are coutners that will be manipulated to correctly handle updating the users location as they progress outside
  const candidateRef = useRef<number | null>(null);
  const hitsRef = useRef(0);
  const missRef = useRef(0);
  const lastSetAtRef = useRef(0);

  useEffect(() => {
    if (!routeStarted) return; // only track location and advance if the route has started
    if (!location) return; // need location to do anything
    if (!hasRoute) return; // need a route to do anything

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

    // We have set windows on which we will compare
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
      missRef.current += 1; // if we are not close to any nodes then we want to count that as a miss

      // If we miss enough times that means that we are no longer on the path
      // So we will show the message to the user that need to reroute so we can give them acurate info
      if (missRef.current > 3) {
        setIsManualReroute(false);
        setShowReroutePrompt(true);
        missRef.current = 0;
      }
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
  }, [location, routeStatus, currentRoute, currentNode]);

  // Update whether we're indoors or outdoors whenever we change nodes or routes
  useEffect(() => {
    setIsCurrNodeInDoors(
      currentRoute?.stops?.[currentNode]?.building !== undefined,
    );
    //console.log("currentNode", currentRoute?.stops[currentNode]);
    //console.log("isCurrNodeInDoors", isCurrNodeInDoors);
  }, [currentNode, currentRoute]);

  // Function to check current location permissions
  function hasLocationPermissions(): boolean {
    return locationPermissionStatus?.granted ?? false;
  }

  useEffect(() => {
    // Request location permissions on mount and set up location tracking if granted
    if (!hasLocationPermissions()) {
      requestLocationPermissions();
    }

    // If we have location permissions, add a watcher for when they move
    if (hasLocationPermissions() && !DEBUG_SPOOF) {
      watchLocation(setLocation, (errorReason) =>
        console.log("Location error: " + errorReason),
      );
    }
  }, [locationPermissionStatus]);

  const clamp = (v: number, min: number, max: number) =>
    Math.min(max, Math.max(min, v));

  useEffect(() => {
    // Optional “cool” zoom-in animation on mount
    mapRef.current?.animateToRegion(routeOverview, 900);
  }, []);

  // Render tag markers for every node that has at least one active tag.
  // Uses the highest-priority matching tag for the icon.
  function makeTagMarkers() {
    return graph.nodes
      .filter((node) => {
        if (node.name?.startsWith("~")) return false;
        return node.tags?.some((t) => activeTags.has(t));
      })
      .map((node) => {
        const primaryTag =
          TAG_PRIORITY.find(
            (t) => node.tags.includes(t) && activeTags.has(t),
          ) ?? node.tags.find((t) => activeTags.has(t))!;

        const config = TAG_CONFIG[primaryTag];

        return (
          <TagMarker
            key={`tag-${node.id}`}
            node={node}
            config={config}
            onPress={() => {
              const safe = { ...node, tags: node.tags ?? [] };
              setSelectedNode(safe);
            }}
          />
        );
      });
  }

  // Debug helpers (unchanged)
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

  // Map press -> select closest named node
  function handleMapPress(e: any) {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    const closest = getClosestNode(latitude, longitude, graph);
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

  useEffect(() => {
    mapRef.current?.animateToRegion(KU, 900);
  }, []);

  // If we're locked on the user and the route has started and we have a location fix, keep the map centered on them
  useEffect(() => {
    if (!mapReady) return; //
    if (!isLockedOnUser) return; // only auto-center if we're locked on the user
    if (!routeStarted) return; // only auto-center if the route has started
    if (!hasFix) return; // only auto-center if we have a location fix
    if (!location) return;

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
  }, [location, isLockedOnUser, routeStatus, hasFix]);

  // We have automatic reroute if the user leaves the path, but we also allow the user to
  // manually reroute in the case that we didnt catch that they left the route or other reasons
  function handleManualReroute() {
    setIsManualReroute(true);
    setShowReroutePrompt(true);
  }

  // Compute remaining ETA in minutes whenever the route or currentNode changes
  const etaMinutes = hasRoute
    ? calculateRouteTime(remainingRouteMeters(currentRoute, currentNode))
    : null;

  const etaText =
    etaMinutes !== null
      ? etaMinutes < 1
        ? "< 1 min"
        : `${Math.ceil(etaMinutes)} min`
      : null;

  if (!fontsLoaded) {
    return null;
  }

  // Render
  return (
    <View style={{ flex: 1 }}>
      {/* MAP LAYER (always mounted so tiles stay cached) */}
      <View
        style={[
          StyleSheet.absoluteFillObject,
          { display: isCurrNodeInDoors ? "none" : "flex" },
        ]}
        pointerEvents={isCurrNodeInDoors ? "none" : "auto"}
      ></View>
      {routeStarted && (
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
        mapType={mapReady ? "satellite" : "standard"}
        style={{ flex: 1 }}
        cameraZoomRange={{
          minCenterCoordinateDistance: 12,
          maxCenterCoordinateDistance: 7000,
        }}
        initialRegion={KU}
        pitchEnabled={!isPreviewingRoute} // lock changing the pitch till they start the route
        rotateEnabled={!isPreviewingRoute} // lock rotating till they start
        scrollEnabled={!isPreviewingRoute} // Lock panning if not started
        zoomEnabled={!isPreviewingRoute} // Lock zooming if not started
        showsUserLocation
        onMapReady={() => setMapReady(true)}
        onPanDrag={() => {
          // If the user manually moves the map, we unlock the "lock on user" mode so they can explore the map freely. They can always re-enable lock on user with the button.
          if (routeStarted && isLockedOnUser) setIsLockedOnUser(false);
        }}
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
        {/* Tag markers  */}
        {routeNotStarted && makeTagMarkers()}
        {currentRoute && (
          <RoutePolyline
            route={currentRoute}
            currentNodeIndex={currentNode}
          ></RoutePolyline>
        )}

        {/* Selected-node pin  */}
        {routeNotStarted && selectedNode && (
          <Marker
            coordinate={{ latitude: selectedNode.y, longitude: selectedNode.x }}
          >
            <Image
              source={require("../assets/images/icons/pin.png")}
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

      {/* Bottom info card */}
      {routeNotStarted && (
        <GestureHandlerRootView style={styles.bottomPaneWrapper}>
          <GestureDetector gesture={bottomPanePan}>
            <Animated.View
              /*entering={FadeInDown} exiting={FadeOutDown}*/ style={
                bottomPaneAnimatedStyle
              }
            >
              <BlurView
                intensity={40}
                tint={darkLightMode}
                style={[
                  styles.bottomPane,
                  { height: 2 * screenHeight, bottom: -1.6 * screenHeight },
                ]}
              >
                <View
                  style={[styles.blurredInterior, styles.bottomPaneInterior]}
                >
                  <View style={styles.bottomPaneGrabHandle}></View>
                  <View
                    style={[
                      styles.bottomPaneChild,
                      { height: 0.64 * screenHeight, overflow: "hidden" },
                    ]}
                  >
                    <ScrollView
                      scrollEnabled={
                        bottomPanePosition == "high" ||
                        bottomPaneContentIsScrolled
                      }
                      onScroll={(e) =>
                        setBottomPaneContentIsScrolled(
                          e.nativeEvent.contentOffset.y != 0,
                        )
                      }
                    >
                      {selectedNode && <Text>Blake Stuff Here</Text>}
                      {!selectedNode && <Text>Cole Stuff Here</Text>}
                    </ScrollView>
                  </View>
                </View>
              </BlurView>
            </Animated.View>
          </GestureDetector>
        </GestureHandlerRootView>
      )}
      {routeNotStarted && bottomPanePosition == "hamburger" && (
        <Animated.View
          entering={FadeInDown}
          exiting={FadeOutDown}
          style={[
            styles.hamburgerButton,
            {
              borderRadius: Math.round(0.07 * screenWidth),
              height: Math.round(0.14 * screenWidth),
              width: Math.round(0.22 * screenWidth),
            },
          ]}
        >
          <BlurView
            intensity={40}
            tint={darkLightMode}
            style={[styles.hamburgerBlur]}
          >
            <Pressable
              style={[
                styles.blurredInterior,
                styles.hamburgerBlur,
                { borderRadius: Math.round(0.07 * screenWidth) },
              ]}
              onPress={() => {
                setBottomPanePosition("mid");
                bottomPaneOffset.value = withTiming(0, { duration: 500 });
              }}
            >
              <Burger
                fill="#3C67A8"
                stroke="#3C67A8"
                strokeWidth={0.5}
                style={[styles.hamburger]}
              />
            </Pressable>
          </BlurView>
        </Animated.View>
      )}

      {routeNotStarted && selectedNode && (
        <View style={styles.mapOverlayCard}>
          {/* Node Name - Styled like the Destination label */}
          <Text style={styles.nodeTitle}>{selectedNode.name}</Text>

          {/* Location Features Container */}
          <View style={styles.featuresContainer}>
            <Text style={styles.featuresLabel}>Location Features:</Text>
            {selectedNode.tags && selectedNode.tags.length > 0 ? (
              selectedNode.tags.map((tag: string, index: number) => {
                // Capitalize the first letter: "computers" -> "Computers"
                const capitalizedTag =
                  tag.charAt(0).toUpperCase() + tag.slice(1);

                return (
                  <Text key={index} style={styles.tagText}>
                    • {capitalizedTag}
                  </Text>
                );
              })
            ) : (
              <Text style={styles.tagText}>• No features listed</Text>
            )}
          </View>

          {/* Bubble Buttons Row */}
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
                const calculatedRoute = route(state, graph.nodes[0], [
                  selectedNode,
                ]);

                // If there is no route, log it and return
                if (!calculatedRoute) {
                  dispatch(clearRoute());
                  console.log("No route found!");
                  return;
                }

                // Sanitize the route and then push it to the global state
                dispatch(setRoute(sanitize(calculatedRoute)));

                // Set the destination so it can be refernced later
                dispatch(
                  setDestination({
                    text: selectedNode.name,
                    ids: [selectedNode.id],
                  }),
                );
                dispatch(setStart(graph.nodes[0].name));
                setRouteStatus("previewing");
                setSelectedNode(null);
              }}
            >
              <Text style={styles.buttonLabel}>GO TO</Text>
            </Pressable>
          </View>
        </View>
      )}
      {/* Toggle button */}
      {/* {!isPanelOpen && (
        <Pressable style={styles.featureToggle} onPress={handleFeatureToggle}>
          <OptionsIcon height={42} width={42} />
        </Pressable>
      )} */}

      {/* Search header to allow the user to build a route */}
      <SearchHeader
        setDestination={setDestLocations}
        setCurrLocation={setCurrLocation}
      />

      {/* ── Sliding filter panel ── */}
      {/* <Animated.View
        style={[styles.sidePanel, { width: PANEL_WIDTH }, animatedPanelStyle]}
        pointerEvents="auto"
      >
        <FeatureFilter
          onClose={() => {
            panelOpen.value = false;
            setIsPanelOpen(false);
          }}
        />
      </Animated.View> */}

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
          currentIndoorSegmentKey={`${
            currentRoute?.stops?.[currentNode]?.building?.id ?? "none"
          }-${currentRoute?.stops?.[currentNode]?.floor ?? "none"}`}
          instrList={currentRoute?.directions ?? []}
          setIsRouteStarted={(isStarted) =>
            setRouteStatus(isStarted ? "started" : "not started")
          }
          setShowReroutePrompt={setShowReroutePrompt}
          setIsManualReroute={setIsManualReroute}
        />
      </View>
      {/* Want to show a summary of the route before they choose to start it, this can show on both outside and inside */}
      {isPreviewingRoute && (
        <RouteSummary
          setIsRouteStarted={(isStarted) =>
            setRouteStatus(isStarted ? "started" : "not started")
          }
          routeLength={currentRoute?.length ?? 0}
          startingLocation={currentRoute?.stops[0]?.name}
          endingLocation={
            currentRoute?.stops[currentRoute.stops.length - 1]?.name
          }
        />
      )}
      {/* only show end route button if we're outdoors, since indoors we have the end route button in the indoor nav screen */}
      {routeStarted && !isCurrNodeInDoors && (
        <EndRoute
          setIsRouteStarted={(isStarted) =>
            setRouteStatus(isStarted ? "started" : "not started")
          }
        />
      )}
      {/* only show lock on user button if we're outdoors and the route has started */}
      {!isLockedOnUser && !isCurrNodeInDoors && routeStarted && (
        <LockOnUser setIsLockedOnUser={setIsLockedOnUser} />
      )}
      {/* ETA pill — shown between recenter and reroute buttons */}
      {routeStarted && !isCurrNodeInDoors && etaText && (
        <View style={styles.etaPill}>
          <Text style={styles.etaText}>ETA {etaText}</Text>
        </View>
      )}
      {/* A button that will allow the user to reroute manually */}
      {!isCurrNodeInDoors && routeStarted && !showReroutePrompt && (
        <TouchableOpacity
          style={styles.rerouteButton}
          onPress={handleManualReroute}
        >
          <Reroute width={30} height={30} style={styles.rerouteIcon} />
        </TouchableOpacity>
      )}
      {showReroutePrompt && (
        <ReroutePrompt
          isManualReroute={isManualReroute}
          setShowReroutePrompt={setShowReroutePrompt}
          setIsRouteStarted={() => {}}
          isIndoors={isCurrNodeInDoors}
        />
      )}
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
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
  blurredInterior: {
    borderColor: "rgba(255,255,255,0.35)",
    borderWidth: 1,
    borderStyle: "solid",
  },
  bottomPaneWrapper: {},
  bottomPane: {
    position: "absolute",
    bottom: 0,
    left: "1%",
    right: 0,
    width: "98%",
    borderRadius: 60,
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
    zIndex: 100,
    overflow: "hidden",
  },
  bottomPaneInterior: {
    flexDirection: "column",
    borderRadius: 60,
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
    paddingHorizontal: 30,
    paddingTop: 15,
    paddingBottom: 40,
    overflow: "hidden",
    height: "100%",
    width: "100%",
  },
  bottomPaneGrabHandle: {
    alignSelf: "center",
    display: "flex",
    width: 50,
    height: 2,
    borderRadius: 1,
    paddingTop: 0,
    backgroundColor: "#356EC4",
  },
  bottomPaneChild: {
    alignSelf: "center",
    display: "flex",
    flexDirection: "column",
    width: "100%",
    height: "100%",
    backgroundColor: "#DDDDDD",
  },
  hamburgerButton: {
    position: "absolute",
    bottom: 25,
    left: 25,
    overflow: "hidden",
  },
  hamburgerBlur: {
    width: "100%",
    height: "100%",
  },
  hamburger: {
    maxWidth: "100%",
    maxHeight: "100%",
    alignSelf: "center",
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
  rerouteButton: {
    position: "absolute",
    alignContent: "center",
    bottom: 100,
    left: 20,
    backgroundColor: "#356EC4",
    padding: 10,
    borderRadius: 40,
    height: "8%",
    width: "16%",
  },
  rerouteIcon: { alignSelf: "center", marginTop: 5 },
  etaPill: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    backgroundColor: "#0A2145",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 1,
  },
  etaText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Orelega One",
  },
});
