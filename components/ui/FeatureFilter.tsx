import {
  addToSelectedFeatures,
  removeFromSelectedFeatures,
  useAppDispatch,
  useAppSelector,
} from "@/redux/appState";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

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

  function handleButtonClick(feature: string) {
    if (isSelected(feature)) {
      dispatch(removeFromSelectedFeatures(feature));
    } else {
      dispatch(addToSelectedFeatures(feature));
    }
  }

  function isSelected(feature: string) {
    return selectedFeatures.includes(feature);
  }

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.headerText}>Filter Features</Text>

        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.featureList}>
        {featureList.map((feature) => (
          <TouchableOpacity
            key={feature}
            style={
              isSelected(feature)
                ? styles.selectedButton
                : styles.nonSelectedButton
            }
            onPress={() => handleButtonClick(feature)}
          >
            <Text
              style={
                isSelected(feature)
                  ? styles.selectedText
                  : styles.nonSelectedText
              }
            >
              {feature}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerText: {
    fontFamily: "Orelega One",
    color: "#356EC4",
    fontSize: 20,
  },
  closeButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#C2DCF0",
    borderRadius: 12,
  },
  closeText: {
    color: "#356EC4",
    fontFamily: "Orelega One",
  },
  featureList: {
    gap: 10,
  },
  selectedButton: {
    backgroundColor: "#356EC4",
    borderRadius: 44,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  nonSelectedButton: {
    backgroundColor: "#C2DCF0",
    borderRadius: 44,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  selectedText: {
    color: "#FFF",
    fontFamily: "Orelega One",
  },
  nonSelectedText: {
    color: "#356EC4",
    fontFamily: "Orelega One",
  },
});
