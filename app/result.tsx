import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ReasonItem } from "@/components/ReasonItem";
import { TrustScoreRing } from "@/components/TrustScoreRing";
import { useColors } from "@/hooks/useColors";
import { CATEGORY_META, RiskBadge, ScanResult, SignalType } from "@/types";
import { loadHistory } from "@/utils/storage";

const BADGE_COLOR: Record<RiskBadge, string> = {
  safe: "#10b981",
  suspicious: "#f59e0b",
  dangerous: "#ef4444",
};

const BADGE_HEADLINE: Record<RiskBadge, string> = {
  safe: "Looks Trustworthy",
  suspicious: "Proceed with Caution",
  dangerous: "High Risk — Do Not Trust",
};

const BADGE_SUB: Record<RiskBadge, string> = {
  safe: "No significant red flags detected. Always verify through official channels for financial decisions.",
  suspicious: "Warning signs found. Verify independently before acting on this content.",
  dangerous: "Multiple scam indicators detected. Do NOT comply with any request in this content.",
};

const SIGNAL_COLOR: Record<SignalType, string> = {
  critical: "#ef4444",
  major: "#f59e0b",
  minor: "#64748b",
  positive: "#10b981",
};

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  const hr = Math.floor(min / 60);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  if (hr < 24) return `${hr}h ago`;
  return new Date(ts).toLocaleString();
}

export default function ResultScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [result, setResult] = useState<ScanResult | null>(null);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    loadHistory().then((h) => {
      const found = h.find((x) => x.id === id);
      if (found) setResult(found);
    });
  }, [id]);

  useEffect(() => {
    if (!result) return;
    const type =
      result.badge === "dangerous" ? Haptics.NotificationFeedbackType.Error :
      result.badge === "suspicious" ? Haptics.NotificationFeedbackType.Warning :
      Haptics.NotificationFeedbackType.Success;
    Haptics.notificationAsync(type);
  }, [result?.id]);

  async function handleShare() {
    if (!result) return;
    const criticalCount = (result.signalTypes ?? []).filter(t => t === "critical").length;
    await Share.share({
      message: `🔍 Trust OS Analysis\n\n"${result.displayInput}"\n\nTrust Score: ${result.trustScore}/100 (${result.badge.toUpperCase()})\nConfidence: ${result.confidence}%${criticalCount > 0 ? `\n⚠️ ${criticalCount} critical signal${criticalCount > 1 ? "s" : ""} detected` : ""}\n\n${result.suggestedAction}\n\nAnalyzed with Trust OS — Digital Trust Platform`,
    });
  }

  if (!result) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading result...</Text>
      </View>
    );
  }

  const verdictColor = BADGE_COLOR[result.badge];
  const catMeta = CATEGORY_META[result.category];

  // Signal summary counts
  const types = result.signalTypes ?? result.reasons.map(() => (result.badge === "safe" ? "positive" : result.badge === "suspicious" ? "major" : "critical") as SignalType);
  const criticalCount = types.filter(t => t === "critical").length;
  const majorCount = types.filter(t => t === "major").length;
  const positiveCount = types.filter(t => t === "positive").length;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.scroll, { paddingTop: topInset + 12, paddingBottom: bottomInset + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Nav bar */}
      <Animated.View entering={FadeInDown.duration(300)} style={styles.nav}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.navBtn, { backgroundColor: colors.muted }]}>
          <Ionicons name="arrow-back" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>Analysis Result</Text>
        <TouchableOpacity onPress={handleShare} style={[styles.navBtn, { backgroundColor: colors.muted }]}>
          <Ionicons name="share-outline" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </Animated.View>

      {/* Score card */}
      <Animated.View
        entering={FadeInDown.delay(60).duration(500)}
        style={[styles.scoreCard, { backgroundColor: colors.card, borderColor: verdictColor + "35" }]}
      >
        <View style={styles.scoreTop}>
          <TrustScoreRing trustScore={result.trustScore} badge={result.badge} />
          <View style={styles.scoreRight}>
            <Text style={[styles.verdictHeadline, { color: colors.foreground }]}>
              {BADGE_HEADLINE[result.badge]}
            </Text>
            <Text style={[styles.verdictSub, { color: colors.mutedForeground }]}>
              {BADGE_SUB[result.badge]}
            </Text>

            <View style={styles.metaRow}>
              <View style={[styles.metaPill, { backgroundColor: colors.muted }]}>
                <Ionicons name={catMeta.icon as any} size={11} color={catMeta.color} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{catMeta.label}</Text>
              </View>
              <View style={[styles.metaPill, { backgroundColor: colors.muted }]}>
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{result.confidence}% conf.</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Input preview */}
        <View style={[styles.inputPreview, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Ionicons
            name={result.inputType === "file" ? "attach-outline" : result.inputType === "url" ? "link-outline" : "text-outline"}
            size={13} color={colors.mutedForeground}
          />
          <Text style={[styles.inputText, { color: colors.mutedForeground }]} numberOfLines={1} ellipsizeMode="middle">
            {result.displayInput}
          </Text>
          <Text style={[styles.timestamp, { color: colors.mutedForeground }]}>
            {relativeTime(result.timestamp)}
          </Text>
        </View>
      </Animated.View>

      {/* Signal summary pills */}
      {(criticalCount + majorCount + positiveCount) > 0 && (
        <Animated.View entering={FadeInDown.delay(120).duration(400)} style={styles.signalSummary}>
          {criticalCount > 0 && (
            <View style={[styles.summaryPill, { backgroundColor: "#ef4444" + "18", borderColor: "#ef4444" + "40" }]}>
              <Ionicons name="close-circle" size={13} color="#ef4444" />
              <Text style={[styles.summaryText, { color: "#ef4444" }]}>{criticalCount} Critical</Text>
            </View>
          )}
          {majorCount > 0 && (
            <View style={[styles.summaryPill, { backgroundColor: "#f59e0b" + "18", borderColor: "#f59e0b" + "40" }]}>
              <Ionicons name="alert-circle" size={13} color="#f59e0b" />
              <Text style={[styles.summaryText, { color: "#f59e0b" }]}>{majorCount} Major</Text>
            </View>
          )}
          {positiveCount > 0 && (
            <View style={[styles.summaryPill, { backgroundColor: "#10b981" + "18", borderColor: "#10b981" + "40" }]}>
              <Ionicons name="checkmark-circle" size={13} color="#10b981" />
              <Text style={[styles.summaryText, { color: "#10b981" }]}>{positiveCount} Safe signal{positiveCount > 1 ? "s" : ""}</Text>
            </View>
          )}
        </Animated.View>
      )}

      {/* Suggested action */}
      <Animated.View
        entering={FadeInDown.delay(150).duration(400)}
        style={[styles.actionCard, { backgroundColor: verdictColor + "12", borderColor: verdictColor + "40" }]}
      >
        <View style={styles.actionHeader}>
          <Ionicons name="flash-outline" size={16} color={verdictColor} />
          <Text style={[styles.actionTitle, { color: verdictColor }]}>Suggested Action</Text>
        </View>
        <Text style={[styles.actionText, { color: colors.foreground }]}>{result.suggestedAction}</Text>
      </Animated.View>

      {/* Signal breakdown */}
      <Animated.View
        entering={FadeInDown.delay(200).duration(400)}
        style={[styles.reasonsCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={styles.reasonsHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Signal Breakdown</Text>
          <Text style={[styles.reasonsCount, { color: colors.mutedForeground }]}>
            {result.reasons.length} signal{result.reasons.length !== 1 ? "s" : ""} analyzed
          </Text>
        </View>
        {result.reasons.map((reason, i) => (
          <ReasonItem
            key={i}
            label={result.signalLabels?.[i]}
            text={reason}
            badge={result.badge}
            signalType={types[i]}
          />
        ))}
      </Animated.View>

      {/* Stats */}
      <Animated.View
        entering={FadeInDown.delay(260).duration(400)}
        style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        {[
          { label: "Trust Score", value: `${result.trustScore}/100`, color: verdictColor },
          { label: "Confidence", value: `${result.confidence}%`, color: colors.foreground },
          { label: "Signals", value: `${result.reasons.length}`, color: colors.foreground },
        ].map((s, i) => (
          <React.Fragment key={s.label}>
            {i > 0 && <View style={[styles.statDivider, { backgroundColor: colors.border }]} />}
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
            </View>
          </React.Fragment>
        ))}
      </Animated.View>

      {/* Disclaimer */}
      <Animated.View
        entering={FadeInDown.delay(300).duration(400)}
        style={[styles.disclaimer, { backgroundColor: colors.muted, borderColor: colors.border }]}
      >
        <Ionicons name="information-circle-outline" size={15} color={colors.mutedForeground} />
        <Text style={[styles.disclaimerText, { color: colors.mutedForeground }]}>
          Trust OS uses heuristic and pattern-based analysis. Results are probabilistic guidance — not legal evidence. False positives and false negatives are possible. Always verify through official channels.
        </Text>
      </Animated.View>

      {/* Buttons */}
      <Animated.View entering={FadeInUp.delay(320).duration(400)} style={styles.buttonsRow}>
        <TouchableOpacity
          onPress={() => router.replace("/(tabs)/scan")}
          style={[styles.actionBtnPrimary, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="scan-outline" size={17} color="#fff" />
          <Text style={styles.primaryBtnText}>New Scan</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/history")}
          style={[styles.actionBtnSecondary, { backgroundColor: colors.muted, borderColor: colors.border }]}
        >
          <Ionicons name="time-outline" size={17} color={colors.foreground} />
          <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>History</Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { fontSize: 16 },
  scroll: { paddingHorizontal: 20, gap: 14 },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  navBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  navTitle: { fontSize: 16, fontWeight: "700" },
  scoreCard: { borderRadius: 20, borderWidth: 1.5, padding: 18, gap: 14 },
  scoreTop: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  scoreRight: { flex: 1, gap: 8, justifyContent: "center" },
  verdictHeadline: { fontSize: 17, fontWeight: "800", letterSpacing: -0.3, lineHeight: 22 },
  verdictSub: { fontSize: 13, lineHeight: 18 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  metaPill: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  metaText: { fontSize: 11, fontWeight: "500" },
  inputPreview: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  inputText: { flex: 1, fontSize: 12 },
  timestamp: { fontSize: 11 },
  signalSummary: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  summaryPill: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  summaryText: { fontSize: 12, fontWeight: "700" },
  actionCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 8 },
  actionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  actionTitle: { fontSize: 14, fontWeight: "700" },
  actionText: { fontSize: 14, lineHeight: 20 },
  reasonsCard: { borderRadius: 16, borderWidth: 1, padding: 18 },
  reasonsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  reasonsCount: { fontSize: 12 },
  statsRow: { flexDirection: "row", borderRadius: 16, borderWidth: 1, padding: 20, alignItems: "center" },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statValue: { fontSize: 20, fontWeight: "800" },
  statLabel: { fontSize: 11, fontWeight: "500" },
  statDivider: { width: 1, height: 32 },
  disclaimer: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 12, borderWidth: 1, padding: 14 },
  disclaimerText: { flex: 1, fontSize: 12, lineHeight: 18 },
  buttonsRow: { flexDirection: "row", gap: 12 },
  actionBtnPrimary: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 16 },
  actionBtnSecondary: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 16, borderWidth: 1 },
  primaryBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  secondaryBtnText: { fontSize: 15, fontWeight: "700" },
});
