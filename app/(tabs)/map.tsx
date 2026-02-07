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
      minZoomLevel={14}
      maxZoomLevel={18} // Prevents zooming out so that they always look at just the campus
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
      <Polyline
        coordinates={[
          { latitude: 38.95732, longitude: -95.252774 },
          { latitude: 38.957419, longitude: -95.253358 },
          { latitude: 38.957685, longitude: -95.253491 },
        ]}
        strokeColor="#ff00c3"
        strokeWidth={5}
        lineCap="round"
        lineJoin="round"
      />
    </MapView>
  );
}
