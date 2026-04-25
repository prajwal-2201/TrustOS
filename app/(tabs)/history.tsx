import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScanCard } from "@/components/ScanCard";
import { useColors } from "@/hooks/useColors";
import { RiskBadge, ScanResult } from "@/types";
import { clearHistory, loadHistory, removeFromHistory } from "@/utils/storage";

type Filter = "all" | RiskBadge;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "dangerous", label: "Dangerous" },
  { key: "suspicious", label: "Suspicious" },
  { key: "safe", label: "Safe" },
];

const FILTER_COLORS: Record<Filter, string | null> = {
  all: null,
  dangerous: "#ef4444",
  suspicious: "#f59e0b",
  safe: "#10b981",
};

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [allHistory, setAllHistory] = useState<ScanResult[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [refreshing, setRefreshing] = useState(false);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const fetchHistory = useCallback(async () => {
    const data = await loadHistory();
    setAllHistory(data);
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  }

  async function handleDelete(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await removeFromHistory(id);
    setAllHistory((prev) => prev.filter((h) => h.id !== id));
  }

  function handleClearAll() {
    Alert.alert("Clear All History", "This will permanently remove all scans.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear All",
        style: "destructive",
        onPress: async () => {
          await clearHistory();
          setAllHistory([]);
        },
      },
    ]);
  }

  const filtered = allHistory.filter((item) => {
    if (filter !== "all" && item.badge !== filter) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      return (
        item.displayInput.toLowerCase().includes(s) ||
        item.category.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const dangerousCount = allHistory.filter((h) => h.badge === "dangerous").length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 12, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.title, { color: colors.foreground }]}>History</Text>
          <View style={styles.headerRight}>
            {dangerousCount > 0 && (
              <View style={[styles.dangerBadge, { backgroundColor: "#ef4444" }]}>
                <Text style={styles.dangerBadgeText}>{dangerousCount} dangerous</Text>
              </View>
            )}
            {allHistory.length > 0 && (
              <TouchableOpacity onPress={handleClearAll}>
                <Text style={[styles.clearBtn, { color: colors.destructive }]}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Search */}
        <View style={[styles.searchRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search scans..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filters */}
        <View style={styles.filtersRow}>
          {FILTERS.map((f) => {
            const isActive = filter === f.key;
            const fColor = FILTER_COLORS[f.key];
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isActive
                      ? (fColor ? fColor + "20" : colors.primary + "20")
                      : colors.muted,
                    borderColor: isActive
                      ? (fColor ? fColor + "60" : colors.primary + "60")
                      : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    {
                      color: isActive
                        ? (fColor ?? colors.primary)
                        : colors.mutedForeground,
                    },
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: bottomInset + 90 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <ScanCard
            item={item}
            onPress={() => router.push({ pathname: "/result", params: { id: item.id } })}
            onDelete={() => handleDelete(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="scan-circle-outline" size={60} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {search || filter !== "all" ? "No matching scans" : "No scans yet"}
            </Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              {search || filter !== "all"
                ? "Try a different search or filter."
                : "Go to Scan to analyze your first file."}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 32, fontWeight: "800", letterSpacing: -1 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  dangerBadge: {
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  dangerBadgeText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  clearBtn: { fontSize: 15, fontWeight: "600" },
  searchRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14 },
  filtersRow: { flexDirection: "row", gap: 8 },
  filterPill: {
    borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  filterText: { fontSize: 13, fontWeight: "600" },
  list: { padding: 20 },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginTop: 8 },
  emptySub: { fontSize: 14, textAlign: "center", maxWidth: 220 },
});
