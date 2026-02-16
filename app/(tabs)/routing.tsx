import { Edge } from "@/maps/graph";
import React, { useEffect, useRef } from "react";
import MapView, { Marker, Polyline } from "react-native-maps";
import { getRoute, getState } from "../Utils/state";



export default function TabTwoScreen() {
  const mapRef = useRef<MapView>(null);
  const KU = {
    latitude: 38.9541967,
    longitude: -95.2597806,
    latitudeDelta: 0.01, // smaller = more zoomed in
    longitudeDelta: 0.01,
  };


  const state = getState(); // get the current state of app
  const currentRoute = getRoute(state); //get current route 

  // route for testing
  //const currentRoute = { stops: [graph.nodes[0], graph.nodes[1], graph.nodes[2]] };

  // CURRENT ROUTE DISPLAY - makes a line through stops
  function makeRoutePolyline(stops) {
  if (!stops || stops.length < 2) return null; // return if route too short

  //each stop into coordinates
  const coords = stops.map((node) => ({
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
  function makeDataLines(edges: Edge[])
  {
    let i = 0;

    let out = []
    for(const edge of edges)
    {
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
      />
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
    mapRef.current?.animateToRegion(KU, 900);
  }, []);

  return (
    <MapView
      ref={mapRef}
      style={{ flex: 1 }}
      //minZoomLevel={14}
      //maxZoomLevel={18} // Prevents zooming out so that they always look at just the campus
      initialRegion={KU} // This places them over the campus on load
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
      <Marker
        coordinate={{ latitude: KU.latitude, longitude: KU.longitude }}
        title="KU Campus"
      />
      <Marker
        coordinate={{ latitude: 38.957419, longitude: -95.253358 }}
        title="Engineering Campus"
      />

      {currentRoute && makeRoutePolyline(currentRoute.stops)}

     {/*can be uncommented to drop markers at all nodes to make it easier to see map layout  */}
      {/*{graph.nodes.map((node) => (
        <Marker
          key={`node-${node.id}`}
          coordinate={{ latitude: node.y, longitude: node.x }}
          pinColor="blue"
          title={`Node ID: ${node.id}`}
        />
      ))}
      {makeDataLines(graph.edges)}*/}

    </MapView>
  );
}
