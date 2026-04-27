/**
 * File: LockOnUser.tsx
 * Purpose: A button to make the screen "follow" the user
 * Author: Michael B, C. Cooper
 * Date Created: 2026-03-01
 */

import { BlurView } from "expo-blur";
import React from "react";
import { StyleSheet, TouchableOpacity, useColorScheme, useWindowDimensions } from "react-native";
import Cursor from "../../assets/images/icons/cursor.svg";

interface LockOnUserProps
{
  setIsLockedOnUser: (isLocked: boolean) => void;
}

export default function LockOnUser(props: LockOnUserProps)
{
  const darkMode = useColorScheme() == "dark";
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const { setIsLockedOnUser } = props;
  return (
    <BlurView tint={darkMode ? "dark" : "light"} intensity={80} style={[styles.lockOnUserContainer, { bottom: 20 + 10 + 0.05 * screenHeight }]}>
      <TouchableOpacity style={[styles.blurredInterior]}
        onPress={() => setIsLockedOnUser(true)}
      >
        <Cursor width={30} height={30} style={styles.cursorStyle} />
      </TouchableOpacity>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  lockOnUserContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    bottom: 20,
    right: 20,
    borderRadius: "50%",
    height: "8%",
    maxHeight: "8%",
    aspectRatio: "1/1",
    overflow: "hidden"
  },
  cursorStyle: {
  },
  blurredInterior: {
    borderColor: "rgba(255,255,255,0.35)",
    borderWidth: 1,
    borderStyle: "solid",
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    alignItems: "center",
    justifyContent: "center",
  }
});
