/**
 * File: LockOnUser.tsx
 * Purpose: A button to make the screen "follow" the user
 * Author: Michael B
 * Date Created: 2026-03-01
 */

import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import Cursor from "../../assets/images/icons/cursor.svg";

interface LockOnUserProps {
  setIsLockedOnUser: (isLocked: boolean) => void;
}

export default function LockOnUser(props: LockOnUserProps) {
  const { setIsLockedOnUser } = props;
  return (
    <TouchableOpacity
      style={styles.lockOnUserContainer}
      onPress={() => setIsLockedOnUser(true)}
    >
      <Cursor width={30} height={30} style={styles.cursorStyle} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  lockOnUserContainer: {
    position: "absolute",
    alignContent: "center",
    bottom: 20,
    left: 20,
    backgroundColor: "#356EC4",
    padding: 10,
    borderRadius: 40,
    height: "8%",
    width: "16%",
  },
  cursorStyle: {
    alignSelf: "center",
    marginTop: 5,
  },
});
