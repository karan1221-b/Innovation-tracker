import { useState } from "react";
import { StyleSheet, Text, View, Pressable, ScrollView } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/src/api";
import { AppButton, Input, useToast } from "@/src/ui";
import { colors, spacing, font, radius, shadow } from "@/src/theme";

const DATES = ["Today", "Tomorrow", "In 2 days"];
const TIMES = ["Morning (9-12)", "Afternoon (12-4)", "Evening (4-8)"];

export default function Book() {
  const params = useLocalSearchParams<{ professional_id: string; pro_name: string; category: string; price_min: string; price_max: string; problem_text: string; urgency: string; media: string }>();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();

  const [problem, setProblem] = useState(params.problem_text || "");
  const [address, setAddress] = useState("");
  const [date, setDate] = useState("Today");
  const [time, setTime] = useState("Morning (9-12)");
  const [urgency, setUrgency] = useState(params.urgency || "normal");
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    if (!problem.trim()) return toast("Please describe the problem", "error");
    if (!address.trim()) return toast("Please enter your address", "error");
    setLoading(true);
    try {
      const media = JSON.parse(params.media || "[]");
      const booking = await apiFetch<any>("/bookings", {
        method: "POST",
        body: {
          professional_id: params.professional_id, category: params.category, problem_text: problem.trim(),
          address: address.trim(), scheduled_date: date, scheduled_time: time, urgency,
          instructions: instructions.trim(), media_urls: media,
          estimated_price_min: Number(params.price_min), estimated_price_max: Number(params.price_max),
        },
      });
      toast("Booking request sent!", "success");
      router.replace({ pathname: "/booking/[id]", params: { id: booking.id } });
    } catch (e: any) {
      toast(e.message || "Could not create booking", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="book-back" onPress={() => router.back()} hitSlop={10}><Ionicons name="chevron-back" size={26} color={colors.onSurface} /></Pressable>
        <Text style={styles.headerTitle}>Book service</Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAwareScrollView bottomOffset={90} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing["3xl"] }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.proBox}>
          <Ionicons name="person-circle" size={22} color={colors.brandPrimary} />
          <Text style={styles.proBoxText}>{params.pro_name}</Text>
        </View>

        <Text style={styles.label}>Describe the problem</Text>
        <Input testID="book-problem-input" value={problem} onChangeText={setProblem} placeholder="What needs fixing?" multiline style={{ height: 90, paddingTop: 12, textAlignVertical: "top" }} />

        <Input label="Service address" testID="book-address-input" value={address} onChangeText={setAddress} placeholder="Flat / House no, Street, Area" multiline style={{ height: 70, paddingTop: 12, textAlignVertical: "top" }} />

        <Text style={styles.label}>Preferred date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {DATES.map((d) => (
            <Pressable key={d} testID={`date-${d}`} onPress={() => setDate(d)} style={[styles.chip, date === d && styles.chipActive]}>
              <Text style={[styles.chipText, date === d && styles.chipTextActive]}>{d}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.label}>Preferred time</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {TIMES.map((t) => (
            <Pressable key={t} testID={`time-${t}`} onPress={() => setTime(t)} style={[styles.chip, time === t && styles.chipActive]}>
              <Text style={[styles.chipText, time === t && styles.chipTextActive]}>{t}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.label}>Urgency</Text>
        <View style={styles.urgRow}>
          {(["normal", "emergency"] as const).map((u) => (
            <Pressable key={u} testID={`urgency-${u}`} onPress={() => setUrgency(u)} style={[styles.urgCard, urgency === u && (u === "emergency" ? styles.urgEmg : styles.chipActive)]}>
              <Ionicons name={u === "emergency" ? "alert-circle" : "calendar"} size={18} color={urgency === u ? (u === "emergency" ? colors.error : colors.brandPrimary) : colors.muted} />
              <Text style={[styles.urgText, urgency === u && { color: u === "emergency" ? colors.error : colors.brandPrimary }]}>{u === "emergency" ? "Emergency" : "Standard"}</Text>
            </Pressable>
          ))}
        </View>

        <Input label="Additional instructions (optional)" testID="book-instructions-input" value={instructions} onChangeText={setInstructions} placeholder="Gate code, landmark, etc." multiline style={{ height: 60, paddingTop: 12, textAlignVertical: "top" }} />

        <View style={styles.estBox}>
          <View>
            <Text style={styles.estLabel}>Estimated price</Text>
            <Text style={styles.estHint}>Final price confirmed by the professional</Text>
          </View>
          <Text style={styles.estPrice}>₹{params.price_min}–₹{params.price_max}</Text>
        </View>
        {urgency === "emergency" && <Text style={styles.emgWarn}>⚠ Emergency service may incur additional charges.</Text>}
      </KeyboardAwareScrollView>

      <KeyboardStickyView>
        <View style={[styles.cta, { paddingBottom: insets.bottom + spacing.md }]}>
          <AppButton title="Confirm booking" testID="confirm-booking-button" onPress={confirm} loading={loading} />
        </View>
      </KeyboardStickyView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  headerTitle: { fontSize: font.lg, fontWeight: "600", color: colors.onSurface },
  proBox: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.brandTertiary, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.lg },
  proBoxText: { fontSize: font.base, fontWeight: "700", color: colors.onBrandTertiary },
  label: { fontSize: font.base, fontWeight: "500", color: colors.onSurfaceSecondary, marginBottom: spacing.sm },
  chipRow: { gap: spacing.sm, paddingBottom: spacing.lg },
  chip: { flexShrink: 0, paddingHorizontal: spacing.lg, height: 40, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  chipActive: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  chipText: { fontSize: font.base, color: colors.onSurfaceTertiary, fontWeight: "500" },
  chipTextActive: { color: colors.brandPrimary, fontWeight: "700" },
  urgRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg },
  urgCard: { flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: spacing.sm, height: 52, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border },
  urgEmg: { borderColor: colors.error, backgroundColor: "#FEF2F2" },
  urgText: { fontSize: font.base, fontWeight: "600", color: colors.onSurfaceTertiary },
  estBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.surfaceSecondary, padding: spacing.lg, borderRadius: radius.md, marginTop: spacing.sm },
  estLabel: { fontSize: font.base, fontWeight: "600", color: colors.onSurface },
  estHint: { fontSize: font.sm, color: colors.onSurfaceTertiary, marginTop: 2 },
  estPrice: { fontSize: font.xl, fontWeight: "700", color: colors.brandPrimary },
  emgWarn: { fontSize: font.sm, color: colors.error, marginTop: spacing.md },
  cta: { padding: spacing.lg, backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
