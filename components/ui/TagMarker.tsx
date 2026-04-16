// ---------------------------------------------------------------------------
// TagMarker is a self-contained component so React can manage its own
// tracksViewChanges lifecycle. Starts true so the native view has time to

import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Marker } from "react-native-maps";

// measure, then flips to false after the first render to stop thrashing.
export default function TagMarker({
  node,
  config,
  onPress,
}: {
  node: any;
  config: { emoji: string; color: string; label: string };
  onPress: () => void;
}) {
  const [tracked, setTracked] = useState(true);

  useEffect(() => {
    // Give the native layer one frame to measure the custom view, then lock it.
    const id = setTimeout(() => setTracked(false), 500);
    return () => clearTimeout(id);
  }, []);

  return (
    <Marker
      key={`tag-${node.id}`}
      coordinate={{ latitude: node.y, longitude: node.x }}
      tracksViewChanges={tracked}
      anchor={{ x: 0.5, y: 1 }}
      onPress={onPress}
    >
      <View style={styles.markerContainer}>
        {/* Bubble */}
        <View
          style={[styles.tagMarkerBubble, { backgroundColor: config.color }]}
        >
          <Text style={styles.tagMarkerEmoji}>{config.emoji}</Text>
        </View>
        {/* Tail / caret pointing down */}
        <View
          style={[styles.tagMarkerTail, { borderTopColor: config.color }]}
        />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  // Wrapper so the anchor point sits at the tip of the tail
  markerContainer: {
    alignItems: "center",

    overflow: "visible",
  },
  tagMarkerBubble: {
    width: 40,
    height: 40,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
    // White border so the bubble pops against the satellite map
    borderWidth: 2,
    borderColor: "#fff",
    overflow: "visible",
  },
  tagMarkerEmoji: {
    fontSize: 22,
    // Prevent the emoji from being clipped on Android
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  tagMarkerTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    // borderTopColor is set inline to match the bubble color
  }})