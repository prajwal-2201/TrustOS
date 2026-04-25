import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { loadHistory } from "@/utils/storage";
import { clearHistory } from "@/utils/storage";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [scanCount, setScanCount] = useState(0);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    loadHistory().then((h) => setScanCount(h.length));
  }, []);

  function handleClearHistory() {
    Alert.alert(
      "Delete All History",
      "This will permanently delete all your scan history.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: async () => {
            await clearHistory();
            setScanCount(0);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  }

  function SettingRow({
    icon,
    label,
    sublabel,
    value,
    onToggle,
    iconBg,
    iconColor,
    danger,
    onPress,
    rightEl,
  }: {
    icon: string;
    label: string;
    sublabel?: string;
    value?: boolean;
    onToggle?: (v: boolean) => void;
    iconBg?: string;
    iconColor?: string;
    danger?: boolean;
    onPress?: () => void;
    rightEl?: React.ReactNode;
  }) {
    const bg = iconBg ?? colors.primary + "15";
    const ic = iconColor ?? colors.primary;

    const inner = (
      <View style={[styles.settingRow, { borderColor: colors.border }]}>
        <View style={[styles.settingIcon, { backgroundColor: bg }]}>
          <Ionicons name={icon as any} size={18} color={ic} />
        </View>
        <View style={styles.settingText}>
          <Text style={[styles.settingLabel, { color: danger ? colors.destructive : colors.foreground }]}>
            {label}
          </Text>
          {sublabel && (
            <Text style={[styles.settingSubLabel, { color: colors.mutedForeground }]}>
              {sublabel}
            </Text>
          )}
        </View>
        {rightEl ?? (
          onToggle ? (
            <Switch
              value={value}
              onValueChange={(v) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onToggle(v);
              }}
              trackColor={{ false: colors.border, true: colors.primary + "80" }}
              thumbColor={value ? colors.primary : colors.mutedForeground}
            />
          ) : (
            <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
          )
        )}
      </View>
    );

    if (onPress) {
      return <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{inner}</TouchableOpacity>;
    }
    return inner;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.scroll,
        { paddingTop: topInset + 12, paddingBottom: bottomInset + 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(350)}>
        <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
      </Animated.View>

      {/* Stats card */}
      <Animated.View
        entering={FadeInDown.delay(60).duration(350)}
        style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{scanCount}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total Scans</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.success }]}>Free</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Current Plan</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.foreground }]}>v1.0</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Version</Text>
        </View>
      </Animated.View>

      {/* Appearance */}
      <Animated.View entering={FadeInDown.delay(100).duration(350)}>
        <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>APPEARANCE</Text>
        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow
            icon="moon-outline"
            label="Dark Mode"
            sublabel="Override system appearance"
            value={darkMode}
            onToggle={setDarkMode}
          />
        </View>
      </Animated.View>

      {/* Privacy & Notifications */}
      <Animated.View entering={FadeInDown.delay(140).duration(350)}>
        <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>PRIVACY & ALERTS</Text>
        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow
            icon="notifications-outline"
            label="Scam Alerts"
            sublabel="Notify when new scam patterns emerge"
            value={notifications}
            onToggle={setNotifications}
          />
          <SettingRow
            icon="eye-off-outline"
            label="Privacy Mode"
            sublabel="Hide scan previews in the app switcher"
            value={privacyMode}
            onToggle={setPrivacyMode}
          />
        </View>
      </Animated.View>

      {/* Data */}
      <Animated.View entering={FadeInDown.delay(180).duration(350)}>
        <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>DATA</Text>
        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow
            icon="trash-outline"
            label="Delete Scan History"
            sublabel={`${scanCount} scan${scanCount !== 1 ? "s" : ""} stored locally`}
            danger
            onPress={handleClearHistory}
            iconBg={"#ef444415"}
            iconColor="#ef4444"
          />
        </View>
      </Animated.View>

      {/* About */}
      <Animated.View entering={FadeInDown.delay(220).duration(350)}>
        <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>ABOUT</Text>
        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow
            icon="shield-checkmark-outline"
            label="Trust OS"
            sublabel="Digital Trust Platform — v1.0.0"
            iconBg={colors.primary + "15"}
            iconColor={colors.primary}
            rightEl={<View />}
          />
          <SettingRow
            icon="information-circle-outline"
            label="How It Works"
            sublabel="Learn about our detection methods"
          />
          <SettingRow
            icon="flag-outline"
            label="Report a Scam"
            sublabel="Help protect the community"
            iconBg={colors.warning + "15"}
            iconColor={colors.warning}
          />
        </View>
      </Animated.View>

      {/* Disclaimer */}
      <Animated.View entering={FadeInDown.delay(260).duration(350)}>
        <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
          Trust OS uses heuristic analysis. Results are probabilistic guidance — not legal advice. Always verify through official channels.
        </Text>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, gap: 20 },
  title: { fontSize: 32, fontWeight: "800", letterSpacing: -1, marginBottom: 4 },
  statsCard: {
    flexDirection: "row", borderRadius: 16, borderWidth: 1,
    padding: 20, alignItems: "center",
  },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 11, fontWeight: "500" },
  statDivider: { width: 1, height: 36 },
  groupLabel: {
    fontSize: 11, fontWeight: "700", letterSpacing: 0.8,
    marginBottom: 8, marginLeft: 4,
  },
  group: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  settingRow: {
    flexDirection: "row", alignItems: "center", gap: 14,
    padding: 16, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  settingText: { flex: 1, gap: 2 },
  settingLabel: { fontSize: 15, fontWeight: "600" },
  settingSubLabel: { fontSize: 12, lineHeight: 16 },
  disclaimer: { fontSize: 12, lineHeight: 18, textAlign: "center" },
});
