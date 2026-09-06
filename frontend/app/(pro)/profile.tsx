import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View, Pressable, ScrollView } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { useAuth } from "@/src/AuthContext";
import { apiFetch } from "@/src/api";
import { AppButton, Input, Loading, VerifiedBadge, useToast } from "@/src/ui";
import { colors, spacing, font, radius, shadow } from "@/src/theme";

const CATS = ["plumbing", "electrical", "ac_cooling", "appliance_repair", "cleaning", "carpentry", "painting", "pest_control", "furniture_assembly", "installation", "other"];

export default function ProProfile() {
  const { user, logout, deleteAccount } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [pro, setPro] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const deleteSheet = useRef<BottomSheet>(null);

  const load = useCallback(async () => {
    try {
      const p = await apiFetch<any>("/pro/profile");
      setPro(p);
      setForm({
        business_name: p.business_name || "", category: p.category || "other",
        skills: (p.skills || []).join(", "), experience_years: String(p.experience_years || 0),
        price_min: String(p.price_min || 0), price_max: String(p.price_max || 0),
        description: p.description || "", service_area: p.service_area || "", eta_minutes: String(p.eta_minutes || 30),
      });
    } catch {} finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const set = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async () => {
    setBusy(true);
    try {
      await apiFetch("/pro/profile", { method: "PATCH", body: {
        business_name: form.business_name, category: form.category,
        skills: form.skills.split(",").map((s: string) => s.trim()).filter(Boolean),
        experience_years: Number(form.experience_years) || 0,
        price_min: Number(form.price_min) || 0, price_max: Number(form.price_max) || 0,
        description: form.description, service_area: form.service_area, eta_minutes: Number(form.eta_minutes) || 30,
      }});
      toast("Profile saved", "success");
      load();
    } catch (e: any) { toast(e.message, "error"); } finally { setBusy(false); }
  };

  if (loading) return <View style={styles.container}><Loading /></View>;

  return (
    <View style={styles.container}>
      <KeyboardAwareScrollView bottomOffset={24} contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingHorizontal: spacing.lg, paddingBottom: 120 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.head}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{(pro?.business_name || "P").charAt(0).toUpperCase()}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{pro?.business_name}</Text>
            <View style={styles.statusRow}>
              {pro?.verification_status === "verified" ? <VerifiedBadge status="verified" /> : (
                <View style={styles.pendingBadge}><Text style={styles.pendingText}>{pro?.verification_status}</Text></View>
              )}
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Business details</Text>
        <Input label="Business name" testID="pro-business-input" value={form.business_name} onChangeText={(v) => set("business_name", v)} />

        <Text style={styles.fieldLabel}>Primary category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.lg }}>
          {CATS.map((c) => (
            <Pressable key={c} testID={`pro-cat-${c}`} onPress={() => set("category", c)} style={[styles.chip, form.category === c && styles.chipActive]}>
              <Text style={[styles.chipText, form.category === c && styles.chipTextActive]}>{c.replace(/_/g, " ")}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Input label="Skills (comma separated)" testID="pro-skills-input" value={form.skills} onChangeText={(v) => set("skills", v)} placeholder="Leak repair, Tap fitting" />
        <View style={styles.row2}>
          <View style={{ flex: 1 }}><Input label="Experience (yrs)" testID="pro-exp-input" value={form.experience_years} onChangeText={(v) => set("experience_years", v)} keyboardType="numeric" /></View>
          <View style={{ flex: 1 }}><Input label="ETA (min)" testID="pro-eta-input" value={form.eta_minutes} onChangeText={(v) => set("eta_minutes", v)} keyboardType="numeric" /></View>
        </View>
        <View style={styles.row2}>
          <View style={{ flex: 1 }}><Input label="Price min (₹)" testID="pro-pmin-input" value={form.price_min} onChangeText={(v) => set("price_min", v)} keyboardType="numeric" /></View>
          <View style={{ flex: 1 }}><Input label="Price max (₹)" testID="pro-pmax-input" value={form.price_max} onChangeText={(v) => set("price_max", v)} keyboardType="numeric" /></View>
        </View>
        <Input label="Service area" testID="pro-area-input" value={form.service_area} onChangeText={(v) => set("service_area", v)} placeholder="Bengaluru" />
        <Input label="About" testID="pro-desc-input" value={form.description} onChangeText={(v) => set("description", v)} multiline style={{ height: 90, paddingTop: 12, textAlignVertical: "top" }} />

        <AppButton title="Save changes" testID="pro-save-button" onPress={save} loading={busy} />
        <AppButton title="Log out" testID="pro-logout-button" variant="outline" icon="log-out-outline" onPress={async () => { await logout(); router.replace("/login"); }} style={{ marginTop: spacing.md }} />
        <Pressable testID="pro-delete-account-button" style={styles.deleteRow} onPress={() => deleteSheet.current?.expand()}>
          <Ionicons name="trash-outline" size={16} color={colors.error} />
          <Text style={styles.deleteText}>Delete my account</Text>
        </Pressable>
      </KeyboardAwareScrollView>

      <BottomSheet ref={deleteSheet} index={-1} snapPoints={[320]} enablePanDownToClose backdropComponent={(p) => <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} />}>
        <BottomSheetView style={{ padding: spacing.xl }}>
          <Text style={styles.deleteTitle}>Delete account?</Text>
          <Text style={styles.deleteWarn}>This permanently removes your professional profile, jobs, messages and reviews. This cannot be undone.</Text>
          <AppButton title="Delete permanently" testID="pro-confirm-delete-button" variant="danger" loading={busy}
            onPress={async () => { setBusy(true); try { await deleteAccount(); toast("Account deleted", "info"); router.replace("/login"); } catch (e: any) { toast(e.message, "error"); setBusy(false); } }}
            style={{ marginTop: spacing.lg }} />
          <AppButton title="Cancel" testID="pro-cancel-delete-button" variant="ghost" onPress={() => deleteSheet.current?.close()} />
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceSecondary },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 26, fontWeight: "700", color: "#fff" },
  name: { fontSize: font.xl, fontWeight: "700", color: colors.onSurface },
  statusRow: { flexDirection: "row", marginTop: 6 },
  pendingBadge: { backgroundColor: "#FEF3C7", paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill },
  pendingText: { fontSize: 11, color: "#92400E", fontWeight: "700", textTransform: "capitalize" },
  sectionTitle: { fontSize: font.lg, fontWeight: "700", color: colors.onSurface, marginBottom: spacing.md },
  fieldLabel: { fontSize: font.base, fontWeight: "500", color: colors.onSurfaceSecondary, marginBottom: spacing.sm },
  chip: { flexShrink: 0, paddingHorizontal: spacing.lg, height: 40, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  chipActive: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  chipText: { fontSize: font.base, color: colors.onSurfaceTertiary, fontWeight: "500", textTransform: "capitalize" },
  chipTextActive: { color: colors.brandPrimary, fontWeight: "700" },
  row2: { flexDirection: "row", gap: spacing.md },
  deleteRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: spacing.lg, paddingVertical: spacing.md },
  deleteText: { color: colors.error, fontWeight: "600", fontSize: font.base },
  deleteTitle: { fontSize: font.xl, fontWeight: "700", color: colors.onSurface },
  deleteWarn: { fontSize: font.base, color: colors.onSurfaceSecondary, lineHeight: 21, marginTop: spacing.sm },
});
