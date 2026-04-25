import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

import { useColors } from "@/hooks/useColors";
import { RiskBadge } from "@/types";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface TrustScoreRingProps {
  trustScore: number;
  badge: RiskBadge;
}

const RING_SIZE = 180;
const STROKE_WIDTH = 16;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const BADGE_COLOR: Record<RiskBadge, string> = {
  safe: "#10b981",
  suspicious: "#f59e0b",
  dangerous: "#ef4444",
};

const BADGE_LABEL: Record<RiskBadge, string> = {
  safe: "SAFE",
  suspicious: "SUSPICIOUS",
  dangerous: "DANGEROUS",
};

export function TrustScoreRing({ trustScore, badge }: TrustScoreRingProps) {
  const colors = useColors();
  const progress = useSharedValue(0);
  const ringColor = BADGE_COLOR[badge];

  useEffect(() => {
    progress.value = withTiming(trustScore / 100, { duration: 1400 });
  }, [trustScore]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  return (
    <View style={styles.container}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          stroke={colors.border}
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />
        <AnimatedCircle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          stroke={ringColor}
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeDasharray={CIRCUMFERENCE}
          animatedProps={animatedProps}
          strokeLinecap="round"
          rotation="-90"
          origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.score, { color: ringColor }]}>{trustScore}</Text>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          Trust Score
        </Text>
        <View style={[styles.badgePill, { backgroundColor: ringColor + "20", borderColor: ringColor + "50" }]}>
          <Text style={[styles.badgeText, { color: ringColor }]}>
            {BADGE_LABEL[badge]}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    position: "absolute",
    alignItems: "center",
    gap: 2,
  },
  score: {
    fontSize: 42,
    fontWeight: "800",
    letterSpacing: -2,
    lineHeight: 46,
  },
  label: {
    fontSize: 11,
    fontWeight: "500",
  },
  badgePill: {
    marginTop: 4,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
});
