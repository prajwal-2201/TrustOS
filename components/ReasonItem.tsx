import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { RiskBadge, SignalType } from "@/types";

interface ReasonItemProps {
  label?: string;
  text: string;
  badge: RiskBadge;
  signalType?: SignalType;
}

const SIGNAL_CONFIG: Record<SignalType, { icon: string; color: string; label: string }> = {
  critical: { icon: "close-circle", color: "#ef4444", label: "CRITICAL" },
  major:    { icon: "alert-circle", color: "#f59e0b", label: "MAJOR" },
  minor:    { icon: "information-circle", color: "#64748b", label: "INFO" },
  positive: { icon: "checkmark-circle", color: "#10b981", label: "SAFE" },
};

const BADGE_FALLBACK: Record<RiskBadge, SignalType> = {
  dangerous: "critical",
  suspicious: "major",
  safe: "positive",
};

export function ReasonItem({ label, text, badge, signalType }: ReasonItemProps) {
  const colors = useColors();
  const type: SignalType = signalType ?? BADGE_FALLBACK[badge];
  const config = SIGNAL_CONFIG[type];

  return (
    <View style={[styles.row, { borderColor: colors.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: config.color + "15" }]}>
        <Ionicons name={config.icon as any} size={16} color={config.color} />
      </View>
      <View style={styles.content}>
        {label && (
          <View style={styles.labelRow}>
            <View style={[styles.typePill, { backgroundColor: config.color + "18" }]}>
              <Text style={[styles.typePillText, { color: config.color }]}>{config.label}</Text>
            </View>
            <Text style={[styles.label, { color: colors.foreground }]} numberOfLines={1}>
              {label}
            </Text>
          </View>
        )}
        <Text style={[styles.description, { color: colors.mutedForeground }]}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: "center", justifyContent: "center", marginTop: 1, flexShrink: 0,
  },
  content: { flex: 1, gap: 4 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  typePill: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  typePillText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  label: { fontSize: 13, fontWeight: "700", flex: 1 },
  description: { fontSize: 13, lineHeight: 19 },
});
