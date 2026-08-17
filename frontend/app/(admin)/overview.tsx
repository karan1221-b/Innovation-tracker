import { useCallback, useRef, useState } from "react";
import { StyleSheet, Text, View, Pressable, ScrollView, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetView, BottomSheetBackdrop, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { useAuth } from "@/src/AuthContext";
import { apiFetch } from "@/src/api";
import { Loading, AppButton, useToast } from "@/src/ui";
import { colors, spacing, font, radius, shadow } from "@/src/theme";

export default function AdminOverview() {
  const { logout } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const commSheet = useRef<BottomSheet>(null);
  const [comm, setComm] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { const s = await apiFetch<any>("/admin/stats"); setStats(s); setComm(String(s.commission_pct)); } catch {} finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const saveComm = async () => {
    setBusy(true);
    try { await apiFetch("/admin/settings/commission", { method: "PATCH", body: { commission_pct: Number(comm) } }); commSheet.current?.close(); toast("Commission updated", "success"); load(); }
    catch (e: any) { toast(e.message, "error"); } finally { setBusy(false); }
  };

  if (loading) return <View style={styles.container}><Loading /></View>;

  const cards = [
    { label: "Total users", value: stats.total_users, icon: "people" },
    { label: "Professionals", value: stats.professionals, icon: "construct" },
    { label: "Total bookings", value: stats.total_bookings, icon: "receipt" },
    { label: "Completed jobs", value: stats.completed_jobs, icon: "checkmark-done" },
    { label: "Revenue", value: `₹${stats.revenue}`, icon: "cash" },
    { label: "Commission", value: `₹${stats.commission}`, icon: "trending-up" },
    { label: "Cancellation", value: `${stats.cancellation_rate}%`, icon: "close-circle" },
    { label: "Pending pros", value: stats.pending_verifications, icon: "time" },
  ];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brandPrimary} />}>
        <View style={styles.head}>
          <View>
            <Text style={styles.brand}>FixIt Admin</Text>
            <Text style={styles.sub}>Platform overview</Text>
          </View>
          <Pressable testID="admin-logout" onPress={async () => { await logout(); router.replace("/login"); }} style={styles.logout}><Ionicons name="log-out-outline" size={22} color={colors.error} /></Pressable>
        </View>

        <View style={styles.grid}>
          {cards.map((c, i) => (
            <View key={i} style={styles.statCard} testID={`stat-${i}`}>
              <View style={styles.statIcon}><Ionicons name={c.icon as any} size={18} color={colors.brandPrimary} /></View>
              <Text style={styles.statValue}>{c.value}</Text>
              <Text style={styles.statLabel}>{c.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.commCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.commTitle}>Platform commission</Text>
            <Text style={styles.commValue}>{stats.commission_pct}%</Text>
            <Text style={styles.commHint}>Applied to every completed booking</Text>
          </View>
          <AppButton title="Edit" variant="outline" testID="edit-commission-button" onPress={() => commSheet.current?.expand()} style={{ paddingHorizontal: spacing.xl, height: 44 }} />
        </View>
      </ScrollView>

      <BottomSheet ref={commSheet} index={-1} snapPoints={[300]} enablePanDownToClose keyboardBehavior="interactive" backdropComponent={(p) => <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} />}>
        <BottomSheetView style={{ padding: spacing.xl }}>
          <Text style={styles.sheetTitle}>Set commission %</Text>
          <BottomSheetTextInput testID="commission-input" value={comm} onChangeText={setComm} keyboardType="numeric" style={styles.input} placeholder="10" placeholderTextColor={colors.muted} />
          <AppButton title="Save" testID="save-commission-button" onPress={saveComm} loading={busy} style={{ marginTop: spacing.md }} />
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceSecondary },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.xl, marginBottom: spacing.lg },
  brand: { fontSize: font["2xl"], fontWeight: "700", color: colors.onSurface },
  sub: { fontSize: font.base, color: colors.onSurfaceTertiary },
  logout: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", ...shadow.card },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", paddingHorizontal: spacing.lg, rowGap: spacing.md },
  statCard: { width: "48%", backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, ...shadow.card },
  statIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  statValue: { fontSize: font.xl, fontWeight: "700", color: colors.onSurface },
  statLabel: { fontSize: font.sm, color: colors.onSurfaceTertiary, marginTop: 2 },
  commCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, margin: spacing.lg, borderWidth: 1, borderColor: colors.border, ...shadow.card },
  commTitle: { fontSize: font.base, color: colors.onSurfaceTertiary },
  commValue: { fontSize: font["2xl"], fontWeight: "700", color: colors.brandPrimary, marginTop: 2 },
  commHint: { fontSize: font.sm, color: colors.onSurfaceTertiary, marginTop: 2 },
  sheetTitle: { fontSize: font.xl, fontWeight: "700", color: colors.onSurface, marginBottom: spacing.lg },
  input: { height: 56, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.lg, fontSize: font.xl, fontWeight: "700", color: colors.onSurface },
});
