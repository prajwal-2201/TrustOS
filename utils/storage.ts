import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScanResult } from "@/types";

const HISTORY_KEY = "trustos_history_v2";
const MAX_HISTORY = 100;

export async function loadHistory(): Promise<ScanResult[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ScanResult[];
  } catch {
    return [];
  }
}

export async function saveToHistory(item: ScanResult): Promise<void> {
  try {
    const existing = await loadHistory();
    const updated = [item, ...existing].slice(0, MAX_HISTORY);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {}
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_KEY);
}

export async function removeFromHistory(id: string): Promise<void> {
  const existing = await loadHistory();
  const updated = existing.filter((h) => h.id !== id);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}
