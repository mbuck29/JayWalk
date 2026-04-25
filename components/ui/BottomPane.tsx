/**
 * File: BottomPane.tsx
 * Purpose: A bottom pane that can be swiped up and down.
 * Author: C. Cooper
 * Date Created: 2026-04-21
 * Date Modified: 2026-04-21
 */

import { isDarkMode } from "@/app/Utils/ui";
import { BlurView } from "expo-blur";
import { PropsWithChildren, useEffect, useState } from "react";
import { ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import
{
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

interface BottomPaneParams
{
  position: "low" | "mid" | "high";
  setPosition: (position: "low" | "mid" | "high") => void;
  lowPosition: number;
  midPosition: number;
  highPosition: number;
  minPosition: number;
  maxPosition: number;
  allowScroll: boolean;
}

export default function BottomPane({
  position,
  setPosition,
  lowPosition,
  midPosition,
  highPosition,
  minPosition,
  maxPosition,
  allowScroll,
  children,
}: PropsWithChildren<BottomPaneParams>)
{
  // BOTTOM PANE ANIMATION VARIABLES
  const bottomPaneOffset = useSharedValue<number>(position == "low" ? lowPosition : position == "mid" ? midPosition : highPosition);
  const [bottomPaneContentIsScrolled, setBottomPaneContentIsScrolled] =
    useState(false);
  const [forceUpdate, setForceUpdate] = useState(false);

  const darkMode = isDarkMode();

  const screenHeight = useWindowDimensions().height;

  const bottomPaneAnimatedStyle = useAnimatedStyle(() =>
  {
    return {
      transform: [
        {
          translateY: bottomPaneOffset.value,
        },
      ],
    };
  });

  useEffect(() =>
  {
    const target =
      position == "mid"
        ? midPosition
        : position == "high"
          ? highPosition
          : lowPosition;

    bottomPaneOffset.value = withTiming(target, {
      duration:
        100 + (500 * Math.abs(target - bottomPaneOffset.value)) / screenHeight,
    });
  }, [position, forceUpdate]);

  const bottomPanePan = Gesture.Pan()
    .onChange((event) =>
    {
      const baseTarget = position == "mid" ? midPosition : position == "high" ? highPosition : minPosition;
      bottomPaneOffset.value = baseTarget + event.translationY;
      if(bottomPaneOffset.value > minPosition)
      {
        bottomPaneOffset.value = minPosition;
      }
      else if(bottomPaneOffset.value < maxPosition)
      {
        bottomPaneOffset.value = maxPosition;
      }
    })
    .onFinalize((event) =>
    {
      let newPosition = position;
      if(Math.abs(event.translationY) > 0.07 * screenHeight)
      {
        const down = event.translationY > 0;
        if(position == "high" && down)
        {
          newPosition = event.translationY > 0.4 * screenHeight ? "low" : "mid";
        }
        else if(position == "mid")
        {
          newPosition = down ? "low" : "high";
        }
        else if(position == "low" && !down)
        {
          newPosition = event.translationY < -0.7 * screenHeight ? "high" : "mid";
        }
      }

      scheduleOnRN(setPosition, newPosition);
      scheduleOnRN(setForceUpdate, !forceUpdate);
    });

  return (
    <GestureHandlerRootView style={styles.bottomPaneWrapper}>
      <GestureDetector gesture={bottomPanePan}>
        <Animated.View style={bottomPaneAnimatedStyle}>
          <BlurView intensity={80} tint={darkMode ? "dark" : "light"} style={[styles.bottomPane, { height: 2 * screenHeight, bottom: -1.6 * screenHeight }]}>
            <View style={[styles.blurredInterior, styles.bottomPaneInterior]}>
              <View style={styles.bottomPaneGrabHandle}></View>
              <View style={[styles.bottomPaneChild, { height: 0.64 * screenHeight }]}>
                <ScrollView scrollEnabled={allowScroll && (position == "high" || bottomPaneContentIsScrolled)}
                  onScroll={(e) => setBottomPaneContentIsScrolled(e.nativeEvent.contentOffset.y != 0)}>
                  {children}
                </ScrollView>
              </View>
            </View>
          </BlurView>
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  blurredInterior: {
    borderColor: "rgba(255,255,255,0.35)",
    borderWidth: 1,
    borderStyle: "solid",
  },
  bottomPaneWrapper: {
    pointerEvents: "auto"
  },
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
    overflow: "hidden",
  },
});
