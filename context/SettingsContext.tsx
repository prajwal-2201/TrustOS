import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { ColorSchemeName } from "react-native";

interface Settings {
  colorScheme: "system" | "light" | "dark";
  notificationsEnabled: boolean;
  privacyMode: boolean;
}

interface SettingsContextValue extends Settings {
  setColorScheme: (v: "system" | "light" | "dark") => void;
  setNotificationsEnabled: (v: boolean) => void;
  setPrivacyMode: (v: boolean) => void;
  clearAllHistory: () => Promise<void>;
  resolvedScheme: ColorSchemeName;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);
const SETTINGS_KEY = "trustos_settings_v1";

export function SettingsProvider({
  children,
  systemScheme,
}: {
  children: React.ReactNode;
  systemScheme: ColorSchemeName;
}) {
  const [settings, setSettings] = useState<Settings>({
    colorScheme: "system",
    notificationsEnabled: true,
    privacyMode: false,
  });

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then((raw) => {
      if (raw) {
        try {
          setSettings(JSON.parse(raw));
        } catch {}
      }
    });
  }, []);

  function persist(updated: Settings) {
    setSettings(updated);
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  }

  const resolvedScheme: ColorSchemeName =
    settings.colorScheme === "system" ? systemScheme : settings.colorScheme;

  return (
    <SettingsContext.Provider
      value={{
        ...settings,
        resolvedScheme,
        setColorScheme: (v) => persist({ ...settings, colorScheme: v }),
        setNotificationsEnabled: (v) => persist({ ...settings, notificationsEnabled: v }),
        setPrivacyMode: (v) => persist({ ...settings, privacyMode: v }),
        clearAllHistory: async () => {
          const { clearHistory } = await import("@/utils/storage");
          await clearHistory();
        },
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be inside SettingsProvider");
  return ctx;
}
