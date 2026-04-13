import {
  addToSelectedFeatures,
  removeFromSelectedFeatures,
  useAppDispatch,
  useAppSelector,
} from "@/redux/appState";
import { BlurView } from "expo-blur";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type FeatureFilterProps = {
  onClose?: () => void;
};

export default function FeatureFilter({ onClose }: FeatureFilterProps) {
  const dispatch = useAppDispatch();
  const selectedFeatures = useAppSelector(
    (state) => state.jayWalk.selectedFeatures,
  );

  const featureList = [
    "Private Restrooms",
    "Printers",
    "Food",
    "Computers",
    "Study Area",
    "Bus Stop",
  ];

  function isSelected(feature: string) {
    return selectedFeatures.includes(feature);
  }

  function handleButtonClick(feature: string) {
    if (isSelected(feature)) {
      dispatch(removeFromSelectedFeatures(feature));
    } else {
      dispatch(addToSelectedFeatures(feature));
    }
  }

  return (
    <BlurView intensity={40} tint="dark" style={styles.container}>
      <View style={styles.innerOverlay}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Filter Features</Text>

          {onClose && (
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.featureList}>
          {featureList.map((feature) => {
            const selected = isSelected(feature);

            return (
              <Pressable
                key={feature}
                style={[
                  styles.featureButton,
                  selected ? styles.selectedButton : styles.nonSelectedButton,
                ]}
                onPress={() => handleButtonClick(feature)}
              >
                <Text
                  style={[
                    styles.featureText,
                    selected ? styles.selectedText : styles.nonSelectedText,
                  ]}
                >
                  {feature}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: "hidden",
  },

  // This gives the blur a soft white wash instead of looking gray/dull.
  innerOverlay: {
    backgroundColor: "rgba(255,255,255,0.18)",
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  headerText: {
    fontFamily: "Orelega One",
    color: "#356EC4",
    fontSize: 20,
  },

  closeButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.32)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },

  closeText: {
    color: "#356EC4",
    fontFamily: "Orelega One",
  },

  featureList: {
    gap: 10,
  },

  featureButton: {
    borderRadius: 44,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  selectedButton: {
    backgroundColor: "#356EC4",
  },

  nonSelectedButton: {
    backgroundColor: "rgba(255,255,255,0.28)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },

  featureText: {
    fontFamily: "Orelega One",
  },

  selectedText: {
    color: "#FFF",
  },

  nonSelectedText: {
    color: "#356EC4",
  },
});
