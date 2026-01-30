import { DeviceMotion, DeviceMotionMeasurement } from "expo-sensors";
import { useEffect, useState } from "react";

export function useOrientation() {
  const [motion, setMotion] = useState<DeviceMotionMeasurement | null>(null);

  useEffect(() => {
    DeviceMotion.setUpdateInterval(100);

    const sub = DeviceMotion.addListener((data) => {
      setMotion(data);
    });

    return () => sub.remove();
  }, []);

  return motion;
}

export function normalize360(deg: number) {
  return (deg + 360) % 360;
}

// Returns a compass heading in degrees (0..360)
// NOTE: This is a simple heading from magnetometer (no tilt compensation).
export function headingFromMagnetometer({ x, y }: { x: number; y: number }) {
  // atan2(y, x) -> radians
  let heading = Math.atan2(y, x) * (180 / Math.PI);
  heading = normalize360(heading);
  return heading;
}

// Simple low-pass filter for smoothing jitter
export function smoothAngle(prev: number, next: number, alpha = 0.15) {
  // Handle wrap-around: choose shortest direction around the circle
  let delta = ((next - prev + 540) % 360) - 180; // -180..180
  return normalize360(prev + alpha * delta);
}
