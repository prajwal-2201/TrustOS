import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScanCard } from "@/components/ScanCard";
import { useColors } from "@/hooks/useColors";
import { CATEGORY_META, ScanCategory, ScanResult } from "@/types";
import { loadHistory } from "@/utils/storage";

const SCAM_ALERTS = [
  {
    id: "a1",
    title: "Fake KYC Update Messages",
    body: "Scammers are sending SMS pretending to be banks asking to update KYC. Banks never ask for OTP via SMS.",
    severity: "dangerous" as const,
  },
  {
    id: "a2",
    title: "WhatsApp Job Scam Surge",
    body: "New wave of fake work-from-home offers asking for ₹500–₹2000 registration fees. Never pay to apply.",
    severity: "dangerous" as const,
  },
  {
    id: "a3",
    title: "QR Code Payment Traps",
    body: "Fraudsters send QR codes claiming you will receive money. Scanning initiates payment FROM your account.",
    severity: "suspicious" as const,
  },
];

const SEVERITY_COLOR = { dangerous: "#ef4444", suspicious: "#f59e0b", safe: "#10b981" };

const CATEGORIES: ScanCategory[] = [
  "payment", "whatsapp", "qr_code", "link_url", "offer_letter", "ai_image",
];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [recentScans, setRecentScans] = useState<ScanResult[]>([]);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const fetchRecent = useCallback(async () => {
    const history = await loadHistory();
    setRecentScans(history.slice(0, 3));
  }, []);

  useEffect(() => {
    fetchRecent();
  }, [fetchRecent]);

  function navigateToScan(category?: ScanCategory) {
    router.push({ pathname: "/(tabs)/scan", params: category ? { category } : {} });
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.scroll,
        { paddingTop: topInset + 12, paddingBottom: bottomInset + 88 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <View>
          <Text style={[styles.logo, { color: colors.primary }]}>Trust OS</Text>
          <Text style={[styles.logoSub, { color: colors.mutedForeground }]}>
            Digital Trust Platform
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/settings")}
          style={[styles.headerBtn, { backgroundColor: colors.muted }]}
        >
          <Ionicons name="settings-outline" size={18} color={colors.foreground} />
        </TouchableOpacity>
      </Animated.View>

      {/* Hero */}
      <Animated.View entering={FadeInDown.delay(60).duration(400)} style={styles.hero}>
        <Text style={[styles.heroTitle, { color: colors.foreground }]}>
          Can I{"\n"}trust this?
        </Text>
        <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
          Upload a screenshot, paste a message, or check a link — get an instant trust score with clear reasons.
        </Text>
        <TouchableOpacity
          onPress={() => navigateToScan()}
          style={[styles.scanNowBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.85}
        >
          <Ionicons name="scan-outline" size={18} color="#fff" />
          <Text style={styles.scanNowText}>Scan Something Now</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Category grid */}
      <Animated.View entering={FadeInDown.delay(120).duration(400)}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Quick Scan
        </Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat, i) => {
            const meta = CATEGORY_META[cat];
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => navigateToScan(cat)}
                activeOpacity={0.75}
                style={[styles.catCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={[styles.catIcon, { backgroundColor: colors.primary + "15" }]}>
                  <Ionicons name={meta.icon as any} size={22} color={colors.primary} />
                </View>
                <Text style={[styles.catLabel, { color: colors.foreground }]}>
                  {meta.label}
                </Text>
                <Text style={[styles.catDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                  {meta.description}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>

      {/* Live Scam Alerts */}
      <Animated.View entering={FadeInDown.delay(200).duration(400)}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Live Scam Alerts
          </Text>
          <View style={[styles.liveChip, { backgroundColor: "#ef4444" + "20" }]}>
            <View style={[styles.liveDot, { backgroundColor: "#ef4444" }]} />
            <Text style={[styles.liveText, { color: "#ef4444" }]}>LIVE</Text>
          </View>
        </View>
        <View style={styles.alertsList}>
          {SCAM_ALERTS.map((alert, i) => (
            <Animated.View
              key={alert.id}
              entering={FadeInRight.delay(200 + i * 60).duration(400)}
              style={[
                styles.alertCard,
                {
                  backgroundColor: colors.card,
                  borderColor: SEVERITY_COLOR[alert.severity] + "40",
                  borderLeftColor: SEVERITY_COLOR[alert.severity],
                },
              ]}
            >
              <View style={styles.alertTop}>
                <Ionicons
                  name="warning-outline"
                  size={14}
                  color={SEVERITY_COLOR[alert.severity]}
                />
                <Text style={[styles.alertTitle, { color: colors.foreground }]}>
                  {alert.title}
                </Text>
              </View>
              <Text style={[styles.alertBody, { color: colors.mutedForeground }]}>
                {alert.body}
              </Text>
            </Animated.View>
          ))}
        </View>
      </Animated.View>

      {/* Recent scans */}
      {recentScans.length > 0 && (
        <Animated.View entering={FadeInDown.delay(280).duration(400)}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Recent Scans
            </Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/history")}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.recentList}>
            {recentScans.map((scan) => (
              <ScanCard
                key={scan.id}
                item={scan}
                onPress={() =>
                  router.push({ pathname: "/result", params: { id: scan.id } })
                }
                onDelete={fetchRecent}
              />
            ))}
          </View>
        </Animated.View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, gap: 28 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logo: { fontSize: 26, fontWeight: "800", letterSpacing: -0.8 },
  logoSub: { fontSize: 12, fontWeight: "500", marginTop: 1 },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },
  hero: { gap: 12 },
  heroTitle: {
    fontSize: 46, fontWeight: "800", letterSpacing: -2, lineHeight: 50,
  },
  heroSub: { fontSize: 15, lineHeight: 22 },
  scanNowBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, paddingVertical: 16, marginTop: 4,
  },
  scanNowText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  sectionHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 12,
  },
  seeAll: { fontSize: 14, fontWeight: "600" },
  categoryGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 14,
  },
  catCard: {
    width: "47%", borderRadius: 16, borderWidth: 1,
    padding: 16, gap: 8,
  },
  catIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  catLabel: { fontSize: 14, fontWeight: "700" },
  catDesc: { fontSize: 12, lineHeight: 16 },
  liveChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 10, fontWeight: "800" },
  alertsList: { gap: 10 },
  alertCard: {
    borderRadius: 12, borderWidth: 1, borderLeftWidth: 3,
    padding: 14, gap: 6,
  },
  alertTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  alertTitle: { fontSize: 13, fontWeight: "700", flex: 1 },
  alertBody: { fontSize: 13, lineHeight: 18 },
  recentList: { gap: 10 },
});
