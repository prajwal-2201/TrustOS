import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScanningAnimation } from "@/components/ScanningAnimation";
import { useColors } from "@/hooks/useColors";
import { CATEGORY_META, ScanCategory } from "@/types";
import { runAnalysis } from "@/utils/analyzer";
import { saveToHistory } from "@/utils/storage";

type InputMode = "file" | "text" | "url";

const CATEGORIES: ScanCategory[] = [
  "general", "payment", "whatsapp", "qr_code", "link_url", "offer_letter", "ai_image",
];

const DEMO_EXAMPLES = [
  {
    label: "OTP Scam SMS",
    icon: "alert-circle-outline",
    mode: "text" as InputMode,
    category: "whatsapp" as ScanCategory,
    content: "URGENT: Your SBI account will be blocked within 24 hours due to incomplete KYC. Click here to update: http://sbi-secure-kyc.xyz/verify?id=82921. Share your OTP to avoid account suspension. Do not delay — act immediately.",
  },
  {
    label: "Phishing URL",
    icon: "link-outline",
    mode: "url" as InputMode,
    category: "link_url" as ScanCategory,
    content: "http://hdfc-netbanking-secure-login.xyz/user/auth?verify=1",
  },
  {
    label: "Fake Job Offer",
    icon: "briefcase-outline",
    mode: "text" as InputMode,
    category: "offer_letter" as ScanCategory,
    content: "Congratulations! You have been selected for a Work From Home internship at TechSoft Solutions. Earn ₹25,000/month working just 2 hours daily. A one-time registration fee of ₹999 is required to activate your training account. Pay via UPI to id: techsofthr@paytm and WhatsApp your receipt to +91-9876543210 immediately.",
  },
];

export default function ScanScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { category: paramCategory, mode: paramMode, prefill } = useLocalSearchParams<{
    category?: ScanCategory;
    mode?: InputMode;
    prefill?: string;
  }>();

  const [mode, setMode] = useState<InputMode>(paramMode ?? "file");
  const [selectedCategory, setSelectedCategory] = useState<ScanCategory>(paramCategory ?? "general");
  const [scanning, setScanning] = useState(false);

  const [file, setFile] = useState<{
    uri: string; name: string; mimeType: string; size: number;
  } | null>(null);
  const [pastedText, setPastedText] = useState(prefill ?? "");
  const [pastedUrl, setPastedUrl] = useState(prefill ?? "");

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    if (paramCategory) setSelectedCategory(paramCategory);
    if (paramMode) setMode(paramMode);
    if (prefill) {
      if (paramMode === "text") setPastedText(prefill);
      if (paramMode === "url") setPastedUrl(prefill);
    }
  }, [paramCategory, paramMode, prefill]);

  const displayInput =
    mode === "file" ? (file?.name ?? "") :
    mode === "text" ? pastedText.slice(0, 60) + (pastedText.length > 60 ? "…" : "") :
    pastedUrl;

  const canAnalyze =
    (mode === "file" && !!file) ||
    (mode === "text" && pastedText.trim().length > 5) ||
    (mode === "url" && pastedUrl.trim().length > 5);

  async function pasteFromClipboard() {
    try {
      const text = await Clipboard.getStringAsync();
      if (!text.trim()) {
        Alert.alert("Clipboard Empty", "No text found in your clipboard.");
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (mode === "url") setPastedUrl(text.trim());
      else setPastedText(text.trim());
    } catch {
      Alert.alert("Paste Failed", "Could not read clipboard.");
    }
  }

  async function handlePickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Needed", "Please grant photo library access in Settings.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 1,
    });
    if (result.canceled || !result.assets.length) return;
    const a = result.assets[0];
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFile({ uri: a.uri, name: a.fileName ?? `image_${Date.now()}.jpg`, mimeType: a.mimeType ?? "image/jpeg", size: a.fileSize ?? 0 });
  }

  async function handleCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Needed", "Please grant camera access in Settings.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 1,
    });
    if (result.canceled || !result.assets.length) return;
    const a = result.assets[0];
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFile({ uri: a.uri, name: a.fileName ?? `camera_${Date.now()}.jpg`, mimeType: a.mimeType ?? "image/jpeg", size: a.fileSize ?? 0 });
  }

  async function handlePickDocument() {
    const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
    if (result.canceled || !result.assets.length) return;
    const a = result.assets[0];
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFile({ uri: a.uri, name: a.name, mimeType: a.mimeType ?? "application/octet-stream", size: a.size ?? 0 });
  }

  function loadDemo(demo: typeof DEMO_EXAMPLES[0]) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode(demo.mode);
    setSelectedCategory(demo.category);
    if (demo.mode === "text") { setPastedText(demo.content); setPastedUrl(""); }
    if (demo.mode === "url") { setPastedUrl(demo.content); setPastedText(""); }
    setFile(null);
  }

  async function handleAnalyze() {
    if (!canAnalyze) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setScanning(true);
    try {
      const result = await runAnalysis({
        inputType: mode,
        category: selectedCategory,
        text: mode === "text" ? pastedText : undefined,
        url: mode === "url" ? pastedUrl.trim() : undefined,
        filename: mode === "file" ? file?.name : undefined,
        mimeType: mode === "file" ? file?.mimeType : undefined,
        fileSize: mode === "file" ? file?.size : undefined,
        fileUri: mode === "file" ? file?.uri : undefined,
      });
      await saveToHistory(result);
      setScanning(false);
      setFile(null); setPastedText(""); setPastedUrl("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push({ pathname: "/result", params: { id: result.id } });
    } catch {
      setScanning(false);
      Alert.alert("Analysis Failed", "Please try again.");
    }
  }

  if (scanning) {
    return (
      <View style={[styles.scanningWrap, { backgroundColor: colors.background, paddingTop: topInset }]}>
        <ScanningAnimation displayInput={displayInput || "your content"} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topInset + 12, paddingBottom: bottomInset + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(350)} style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Scan</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Upload a file, paste text, or enter a suspicious URL
          </Text>
        </Animated.View>

        {/* Input mode tabs */}
        <Animated.View
          entering={FadeInDown.delay(50).duration(350)}
          style={[styles.modeRow, { backgroundColor: colors.muted, borderRadius: colors.radius }]}
        >
          {([
            ["file", "attach-outline", "Upload File"],
            ["text", "text-outline", "Paste Text"],
            ["url", "link-outline", "Check URL"],
          ] as [InputMode, string, string][]).map(([m, icon, label]) => (
            <TouchableOpacity
              key={m}
              onPress={() => setMode(m)}
              style={[
                styles.modeBtn,
                mode === m && { backgroundColor: colors.primary, borderRadius: colors.radius - 4 },
              ]}
            >
              <Ionicons name={icon as any} size={14} color={mode === m ? "#fff" : colors.mutedForeground} />
              <Text style={[styles.modeBtnText, { color: mode === m ? "#fff" : colors.mutedForeground }]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Input area */}
        <Animated.View entering={FadeInDown.delay(90).duration(350)}>
          {mode === "file" && (
            <View style={styles.fileSection}>
              <View style={styles.fileButtons}>
                <TouchableOpacity
                  onPress={handlePickImage}
                  activeOpacity={0.75}
                  style={[styles.fileBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <Ionicons name="image-outline" size={24} color={colors.primary} />
                  <Text style={[styles.fileBtnLabel, { color: colors.foreground }]}>Gallery</Text>
                  <Text style={[styles.fileBtnSub, { color: colors.mutedForeground }]}>JPG, PNG, HEIC, WEBP</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleCamera}
                  activeOpacity={0.75}
                  style={[styles.fileBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <Ionicons name="camera-outline" size={24} color={colors.accent} />
                  <Text style={[styles.fileBtnLabel, { color: colors.foreground }]}>Camera</Text>
                  <Text style={[styles.fileBtnSub, { color: colors.mutedForeground }]}>Capture live photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handlePickDocument}
                  activeOpacity={0.75}
                  style={[styles.fileBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <Ionicons name="document-text-outline" size={24} color="#8b5cf6" />
                  <Text style={[styles.fileBtnLabel, { color: colors.foreground }]}>Document</Text>
                  <Text style={[styles.fileBtnSub, { color: colors.mutedForeground }]}>PDF, DOCX, any</Text>
                </TouchableOpacity>
              </View>
              {file && (
                <View style={[styles.filePreview, { backgroundColor: colors.card, borderColor: colors.primary + "60" }]}>
                  <Ionicons
                    name={file.mimeType.startsWith("image/") ? "image-outline" : "document-text-outline"}
                    size={22} color={colors.primary}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fileName, { color: colors.foreground }]} numberOfLines={1} ellipsizeMode="middle">
                      {file.name}
                    </Text>
                    <Text style={[styles.fileMeta, { color: colors.mutedForeground }]}>
                      {(file.size / 1024).toFixed(1)} KB · {file.mimeType}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setFile(null)}>
                    <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {mode === "text" && (
            <View>
              <View style={[styles.inputHeader, { borderColor: colors.border }]}>
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>
                  Paste suspicious message
                </Text>
                <TouchableOpacity
                  onPress={pasteFromClipboard}
                  style={[styles.pasteBtn, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" }]}
                >
                  <Ionicons name="clipboard-outline" size={14} color={colors.primary} />
                  <Text style={[styles.pasteBtnText, { color: colors.primary }]}>Paste</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.card, borderColor: pastedText.length > 0 ? colors.primary : colors.border, color: colors.foreground }]}
                placeholder="Paste any suspicious WhatsApp message, SMS, offer letter content, or any text..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                value={pastedText}
                onChangeText={setPastedText}
                textAlignVertical="top"
              />
              <Text style={[styles.charCount, { color: colors.mutedForeground }]}>
                {pastedText.length} characters · more text = more accurate analysis
              </Text>
            </View>
          )}

          {mode === "url" && (
            <View>
              <View style={[styles.inputHeader, { borderColor: colors.border }]}>
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>
                  Enter suspicious link
                </Text>
                <TouchableOpacity
                  onPress={pasteFromClipboard}
                  style={[styles.pasteBtn, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" }]}
                >
                  <Ionicons name="clipboard-outline" size={14} color={colors.primary} />
                  <Text style={[styles.pasteBtnText, { color: colors.primary }]}>Paste</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.urlInput, { backgroundColor: colors.card, borderColor: pastedUrl.length > 0 ? colors.primary : colors.border, color: colors.foreground }]}
                placeholder="https://example.com/suspicious-link"
                placeholderTextColor={colors.mutedForeground}
                value={pastedUrl}
                onChangeText={setPastedUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <View style={[styles.urlNote, { backgroundColor: colors.muted }]}>
                <Ionicons name="shield-outline" size={13} color={colors.primary} />
                <Text style={[styles.urlNoteText, { color: colors.mutedForeground }]}>
                  We analyze the URL structure — we never visit the site or send your data anywhere.
                </Text>
              </View>
            </View>
          )}
        </Animated.View>

        {/* Category */}
        <Animated.View entering={FadeInDown.delay(120).duration(350)}>
          <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20 }}>
            {CATEGORIES.map((cat) => {
              const meta = CATEGORY_META[cat];
              const isActive = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  style={[
                    styles.catPill,
                    {
                      backgroundColor: isActive ? meta.color : colors.muted,
                      borderColor: isActive ? meta.color : colors.border,
                    },
                  ]}
                >
                  <Ionicons name={meta.icon as any} size={13} color={isActive ? "#fff" : colors.mutedForeground} />
                  <Text style={[styles.catPillText, { color: isActive ? "#fff" : colors.mutedForeground }]}>
                    {meta.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Analyze button */}
        <Animated.View entering={FadeInDown.delay(160).duration(350)}>
          <TouchableOpacity
            onPress={handleAnalyze}
            disabled={!canAnalyze}
            activeOpacity={0.85}
            style={[styles.analyzeBtn, { backgroundColor: canAnalyze ? colors.primary : colors.muted }]}
          >
            <Ionicons name="shield-checkmark-outline" size={20} color={canAnalyze ? "#fff" : colors.mutedForeground} />
            <Text style={[styles.analyzeBtnText, { color: canAnalyze ? "#fff" : colors.mutedForeground }]}>
              Analyze Now
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Demo examples */}
        <Animated.View entering={FadeInDown.delay(200).duration(350)}>
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Try Demo Examples</Text>
            <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>Tap to pre-fill</Text>
          </View>
          <View style={styles.demoList}>
            {DEMO_EXAMPLES.map((demo) => (
              <TouchableOpacity
                key={demo.label}
                onPress={() => loadDemo(demo)}
                activeOpacity={0.75}
                style={[styles.demoCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={[styles.demoIcon, { backgroundColor: colors.primary + "15" }]}>
                  <Ionicons name={demo.icon as any} size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.demoLabel, { color: colors.foreground }]}>{demo.label}</Text>
                  <Text style={[styles.demoContent, { color: colors.mutedForeground }]} numberOfLines={1} ellipsizeMode="tail">
                    {demo.content}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scanningWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: 20, gap: 20 },
  header: { gap: 4 },
  title: { fontSize: 32, fontWeight: "800", letterSpacing: -1 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  modeRow: { flexDirection: "row", padding: 4, gap: 3 },
  modeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 10 },
  modeBtnText: { fontSize: 12, fontWeight: "600" },
  fileSection: { gap: 12 },
  fileButtons: { flexDirection: "row", gap: 10 },
  fileBtn: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 14, alignItems: "flex-start", gap: 6 },
  fileBtnLabel: { fontSize: 13, fontWeight: "700" },
  fileBtnSub: { fontSize: 10, lineHeight: 14 },
  filePreview: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1.5, padding: 14 },
  fileName: { fontSize: 13, fontWeight: "600" },
  fileMeta: { fontSize: 11, marginTop: 2 },
  inputHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  inputLabel: { fontSize: 13, fontWeight: "600" },
  pasteBtn: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  pasteBtnText: { fontSize: 12, fontWeight: "700" },
  textInput: { borderRadius: 16, borderWidth: 1.5, padding: 16, minHeight: 150, fontSize: 14, lineHeight: 22 },
  charCount: { fontSize: 11, textAlign: "right", marginTop: 6 },
  urlInput: { borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 16, fontSize: 14 },
  urlNote: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 8, padding: 10, marginTop: 8 },
  urlNoteText: { flex: 1, fontSize: 12, lineHeight: 16 },
  sectionLabel: { fontSize: 15, fontWeight: "700", marginBottom: 10 },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionSub: { fontSize: 12 },
  catPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  catPillText: { fontSize: 12, fontWeight: "600" },
  analyzeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 16, paddingVertical: 18 },
  analyzeBtnText: { fontSize: 17, fontWeight: "700" },
  demoList: { gap: 8 },
  demoCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14 },
  demoIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  demoLabel: { fontSize: 13, fontWeight: "700", marginBottom: 2 },
  demoContent: { fontSize: 12 },
});
