import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";

const STEPS = [
  "Checking for manipulation...",
  "Looking for scam signals...",
  "Verifying authenticity...",
  "Detecting AI-generated content...",
  "Scanning for suspicious patterns...",
  "Analyzing metadata...",
  "Cross-checking heuristics...",
  "Computing trust score...",
];

interface ScanningAnimationProps {
  displayInput: string;
}

export function ScanningAnimation({ displayInput }: ScanningAnimationProps) {
  const colors = useColors();
  const rotate = useSharedValue(0);
  const pulse = useSharedValue(0.95);
  const [step, setStep] = useState(0);

  useEffect(() => {
    rotate.value = withRepeat(
      withTiming(360, { duration: 1800, easing: Easing.linear }),
      -1,
      false
    );
    pulse.value = withRepeat(
      withTiming(1.08, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    const interval = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 750);
    return () => clearInterval(interval);
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }));

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <View style={styles.container}>
      <View style={[styles.outerRing, { borderColor: colors.primary + "30" }]}>
        <Animated.View style={[styles.spinRing, { borderColor: colors.primary }, ringStyle]} />
        <Animated.View
          style={[styles.orb, { backgroundColor: colors.primary + "18" }, orbStyle]}
        >
          <View style={[styles.innerDot, { backgroundColor: colors.primary }]} />
        </Animated.View>
      </View>

      <View style={styles.textBlock}>
        <Text style={[styles.title, { color: colors.foreground }]}>Analyzing</Text>
        <Text
          style={[styles.input, { color: colors.mutedForeground }]}
          numberOfLines={1}
          ellipsizeMode="middle"
        >
          {displayInput}
        </Text>
        <Text style={[styles.step, { color: colors.primary }]}>{STEPS[step]}</Text>
      </View>

      <View style={styles.dotsRow}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i === step % 3 ? colors.primary : colors.border,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 24,
    paddingVertical: 48,
    paddingHorizontal: 40,
  },
  outerRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  spinRing: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    borderStyle: "dashed",
  },
  orb: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  innerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  textBlock: {
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  input: {
    fontSize: 13,
    maxWidth: 260,
    textAlign: "center",
  },
  step: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});
