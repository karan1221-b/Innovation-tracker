import { useEffect, useState, useCallback } from "react";
import { StyleSheet, Text, View, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/src/AuthContext";
import { apiFetch } from "@/src/api";
import { pickAndUpload, openSettings } from "@/src/media";
import { useToast, Card } from "@/src/ui";
import { colors, spacing, font, radius, shadow, CATEGORY_ICONS } from "@/src/theme";

type Category = { id: string; slug: string; name: string; icon: string };

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const [media, setMedia] = useState<{ url: string; path: string }[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [classifying, setClassifying] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    try {
      const cats = await apiFetch<Category[]>("/categories");
      setCategories(cats.filter((c) => c.slug !== "other"));
    } catch {}
  }, []);
  useEffect(() => { load(); }, [load]);

  const onUpload = async () => {
    setUploading(true);
    try {
      const res = await pickAndUpload((canAskAgain) => {
        if (canAskAgain) toast("Photo access is needed to attach images", "info");
        else toast("Enable photo access in Settings", "error");
        if (!canAskAgain) setTimeout(openSettings, 800);
      });
      if (res) {
        setMedia((m) => [...m, res]);
        toast("Attached", "success");
      }
    } catch (e: any) {
      toast(e.message || "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  const findHelp = async (urgency: "normal" | "emergency") => {
    if (!text.trim() && media.length === 0 && urgency === "normal") {
      toast("Describe your problem to get started", "info");
      return;
    }
    setClassifying(true);
    try {
      let category = "";
      let category_name = "All professionals";
      let summary = text.trim();
      if (text.trim() || media.length) {
        const cls = await apiFetch<any>("/ai/classify", {
          method: "POST",
          body: { text: text.trim(), media_urls: media.map((m) => m.path) },
        });
        category = cls.category === "other" ? "" : cls.category;
        category_name = cls.category_name;
        summary = cls.summary || summary;
        if (cls.needs_more_info && cls.follow_up_question) {
          toast(cls.follow_up_question, "info");
        }
      }
      router.push({
        pathname: "/matches",
        params: {
          category,
          category_name,
          summary,
          problem_text: text.trim(),
          urgency,
          media: JSON.stringify(media.map((m) => m.path)),
        },
      });
    } catch (e: any) {
      toast(e.message || "Couldn't understand the problem. Please try again.", "error");
    } finally {
      setClassifying(false);
    }
  };

  const goCategory = (c: Category) => {
    Haptics.selectionAsync();
    router.push({
      pathname: "/matches",
      params: { category: c.slug, category_name: c.name, summary: "", problem_text: "", urgency: "normal", media: "[]" },
    });
  };

  return (
    <View style={styles.container}>
      <KeyboardAwareScrollView
        bottomOffset={24}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: 120 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.hello}>Hi, {user?.name?.split(" ")[0] || "there"} 👋</Text>
            <Pressable style={styles.locationRow} testID="location-selector">
              <Ionicons name="location" size={15} color={colors.brandPrimary} />
              <Text style={styles.location}>Bengaluru, Karnataka</Text>
              <Ionicons name="chevron-down" size={14} color={colors.onSurfaceTertiary} />
            </Pressable>
          </View>
          <Pressable testID="home-notifications-button" onPress={() => router.push("/notifications")} style={styles.bell}>
            <Ionicons name="notifications-outline" size={22} color={colors.onSurface} />
          </Pressable>
        </View>

        {/* What's Wrong card */}
        <View style={styles.section}>
          <Text style={styles.whatsWrong}>What's wrong?</Text>
          <Text style={styles.whatsWrongSub}>Describe your problem — we'll find the right pro.</Text>

          <View style={styles.promptCard}>
            <TextInputWrapped value={text} onChangeText={setText} />

            {media.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.md }} contentContainerStyle={{ gap: spacing.sm }}>
                {media.map((m, i) => (
                  <View key={i} style={styles.thumbWrap}>
                    <Image source={{ uri: m.url.startsWith("http") ? m.url : undefined }} style={styles.thumb} contentFit="cover" />
                    <View style={styles.thumbFallback}><Ionicons name="document" size={18} color={colors.brandPrimary} /></View>
                    <Pressable testID={`remove-media-${i}`} style={styles.thumbRemove} onPress={() => setMedia((arr) => arr.filter((_, idx) => idx !== i))}>
                      <Ionicons name="close" size={12} color="#fff" />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={styles.promptActions}>
              <View style={styles.inputIcons}>
                <Pressable testID="voice-input-button" style={styles.iconBtn} onPress={() => toast("Voice input is coming soon", "info")}>
                  <Ionicons name="mic-outline" size={20} color={colors.onSurfaceTertiary} />
                </Pressable>
                <Pressable testID="upload-media-button" style={styles.iconBtn} onPress={onUpload} disabled={uploading}>
                  {uploading ? <ActivityIndicator size="small" color={colors.brandPrimary} /> : <Ionicons name="camera-outline" size={20} color={colors.onSurfaceTertiary} />}
                </Pressable>
              </View>
              <Pressable testID="find-help-button" style={styles.sendBtn} onPress={() => findHelp("normal")} disabled={classifying}>
                {classifying ? <ActivityIndicator color="#fff" size="small" /> : (
                  <>
                    <Ionicons name="sparkles" size={16} color="#fff" />
                    <Text style={styles.sendText}>Find Help</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>

          {/* Emergency */}
          <Pressable testID="emergency-button" style={styles.emergency} onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); findHelp("emergency"); }}>
            <View style={styles.emergencyIcon}><Ionicons name="alert" size={18} color="#fff" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.emergencyTitle}>Emergency request</Text>
              <Text style={styles.emergencySub}>Burst pipe, no power, locked out? Get help fast.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.error} />
          </Pressable>
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Or pick a category</Text>
          <View style={styles.grid}>
            {categories.map((c) => (
              <Pressable key={c.slug} testID={`category-${c.slug}`} style={styles.catCard} onPress={() => goCategory(c)}>
                <View style={styles.catIcon}>
                  <Ionicons name={(CATEGORY_ICONS[c.slug] || "ellipse") as any} size={22} color={colors.brandPrimary} />
                </View>
                <Text style={styles.catName} numberOfLines={1}>{c.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

// Small wrapper so the multiline input keeps a clean API
import { TextInput } from "react-native";
function TextInputWrapped({ value, onChangeText }: { value: string; onChangeText: (t: string) => void }) {
  return (
    <TextInput
      testID="problem-input"
      value={value}
      onChangeText={onChangeText}
      placeholder="e.g. My bathroom tap has been leaking since morning…"
      placeholderTextColor={colors.muted}
      multiline
      style={styles.promptInput}
    />
  );
}

const CARD_GAP = spacing.md;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceSecondary },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  hello: { fontSize: font.xl, fontWeight: "700", color: colors.onSurface },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  location: { fontSize: font.base, color: colors.onSurfaceSecondary, fontWeight: "500" },
  bell: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", ...shadow.card },
  section: { paddingHorizontal: spacing.xl, marginTop: spacing.lg },
  whatsWrong: { fontSize: font["3xl"], fontWeight: "700", color: colors.onSurface, letterSpacing: -0.5 },
  whatsWrongSub: { fontSize: font.base, color: colors.onSurfaceTertiary, marginTop: spacing.xs, marginBottom: spacing.lg },
  promptCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, ...shadow.card },
  promptInput: { minHeight: 72, fontSize: font.lg, color: colors.onSurface, textAlignVertical: "top", lineHeight: 24 },
  promptActions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.md },
  inputIcons: { flexDirection: "row", gap: spacing.sm },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  sendBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.brandPrimary, paddingHorizontal: spacing.lg, height: 44, borderRadius: radius.pill },
  sendText: { color: "#fff", fontWeight: "700", fontSize: font.base },
  thumbWrap: { width: 64, height: 64, borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.brandTertiary },
  thumb: { width: "100%", height: "100%" },
  thumbFallback: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", zIndex: -1 },
  thumbRemove: { position: "absolute", top: 3, right: 3, width: 18, height: 18, borderRadius: 9, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" },
  emergency: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: "#FEF2F2", borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.lg, borderWidth: 1, borderColor: "#FECACA" },
  emergencyIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.error, alignItems: "center", justifyContent: "center" },
  emergencyTitle: { fontSize: font.lg, fontWeight: "700", color: colors.error },
  emergencySub: { fontSize: font.sm, color: "#B91C1C", marginTop: 1 },
  sectionTitle: { fontSize: font.lg, fontWeight: "700", color: colors.onSurface, marginBottom: spacing.md },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: CARD_GAP },
  catCard: { width: "31%", backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: spacing.lg, alignItems: "center", borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  catIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  catName: { fontSize: font.sm, fontWeight: "600", color: colors.onSurfaceSecondary },
});
