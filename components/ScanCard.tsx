import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { CATEGORY_META, RiskBadge, ScanResult } from "@/types";

interface ScanCardProps {
  item: ScanResult;
  onPress: () => void;
  onDelete: () => void;
}

const BADGE_COLOR: Record<RiskBadge, string> = {
  safe: "#10b981",
  suspicious: "#f59e0b",
  dangerous: "#ef4444",
};

const BADGE_LABEL: Record<RiskBadge, string> = {
  safe: "Safe",
  suspicious: "Suspicious",
  dangerous: "Dangerous",
};

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  if (day < 7) return `${day}d ago`;
  return new Date(ts).toLocaleDateString();
}

export function ScanCard({ item, onPress, onDelete }: ScanCardProps) {
  const colors = useColors();
  const badgeColor = BADGE_COLOR[item.badge];
  const catMeta = CATEGORY_META[item.category];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.muted }]}>
        <Ionicons name={catMeta.icon as any} size={20} color={colors.mutedForeground} />
      </View>
      <View style={styles.content}>
        <Text
          style={[styles.input, { color: colors.foreground }]}
          numberOfLines={1}
          ellipsizeMode="middle"
        >
          {item.displayInput}
        </Text>
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          {catMeta.label} · {relativeTime(item.timestamp)}
        </Text>
      </View>
      <View style={styles.right}>
        <View style={[styles.pill, { backgroundColor: badgeColor + "20", borderColor: badgeColor + "50" }]}>
          <Text style={[styles.pillText, { color: badgeColor }]}>
            {BADGE_LABEL[item.badge]}
          </Text>
        </View>
        <Text style={[styles.score, { color: badgeColor }]}>{item.trustScore}/100</Text>
      </View>
      <TouchableOpacity
        onPress={onDelete}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 4,
  },
  input: {
    fontSize: 13,
    fontWeight: "600",
  },
  meta: {
    fontSize: 11,
  },
  right: {
    alignItems: "flex-end",
    gap: 3,
  },
  pill: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  pillText: {
    fontSize: 10,
    fontWeight: "700",
  },
  score: {
    fontSize: 11,
    fontWeight: "700",
  },
});
