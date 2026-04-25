import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { RiskBadge as RiskBadgeType } from "@/types";

interface RiskBadgeProps {
  badge: RiskBadgeType;
  size?: "sm" | "md" | "lg";
}

const CONFIG: Record<RiskBadgeType, { label: string; icon: string; color: string }> = {
  safe: { label: "Safe", icon: "shield-checkmark-outline", color: "#10b981" },
  suspicious: { label: "Suspicious", icon: "alert-circle-outline", color: "#f59e0b" },
  dangerous: { label: "Dangerous", icon: "warning-outline", color: "#ef4444" },
};

export function RiskBadge({ badge, size = "md" }: RiskBadgeProps) {
  const config = CONFIG[badge];
  const isLg = size === "lg";
  const isSm = size === "sm";

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.color + "20",
          borderColor: config.color + "60",
          paddingVertical: isLg ? 10 : isSm ? 3 : 6,
          paddingHorizontal: isLg ? 18 : isSm ? 8 : 12,
          borderRadius: isLg ? 12 : 8,
        },
      ]}
    >
      <Ionicons
        name={config.icon as any}
        size={isLg ? 20 : isSm ? 12 : 16}
        color={config.color}
      />
      <Text
        style={[
          styles.label,
          {
            color: config.color,
            fontSize: isLg ? 18 : isSm ? 11 : 14,
            fontWeight: isLg ? "800" : "700",
          },
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  label: {
    letterSpacing: 0.2,
  },
});
