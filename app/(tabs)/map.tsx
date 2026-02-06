import React, { useEffect, useRef } from "react";
import MapView, { Marker } from "react-native-maps";

export default function TabTwoScreen() {
  const mapRef = useRef<MapView>(null);
  const NE = { latitude: 38.972, longitude: -95.23 };
  const SW = { latitude: 38.941, longitude: -95.286 };
  const KU = {
    latitude: 38.9541967,
    longitude: -95.2597806,
    latitudeDelta: 0.01, // smaller = more zoomed in
    longitudeDelta: 0.01,
  };
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
      maxZoomLevel={18}
      initialRegion={KU}
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
    </MapView>
  );
}
