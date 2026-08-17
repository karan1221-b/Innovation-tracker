import { useCallback, useRef, useState } from "react";
import { StyleSheet, Text, View, Pressable, ScrollView, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import BottomSheet, { BottomSheetView, BottomSheetBackdrop, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { useAuth } from "@/src/AuthContext";
import { apiFetch } from "@/src/api";
import { Loading, EmptyState, AppButton, useToast } from "@/src/ui";
import { StatusPill } from "@/src/status";
import { colors, spacing, font, radius, shadow } from "@/src/theme";

const NEXT: Record<string, { next: string; label: string }> = {
  confirmed: { next: "on_the_way", label: "Start travelling" },
  on_the_way: { next: "arrived", label: "Mark arrived" },
  arrived: { next: "work_started", label: "Start work" },
  work_started: { next: "work_completed", label: "Complete & set price" },
};
const AV = [
  { key: "available", label: "Available", color: colors.success },
  { key: "busy", label: "Busy", color: colors.warning },
  { key: "offline", label: "Offline", color: colors.muted },
];

export default function ProDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const priceSheet = useRef<BottomSheet>(null);
  const [price, setPrice] = useState("");
  const [activeBid, setActiveBid] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setData(await apiFetch("/pro/dashboard")); } catch {} finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const setAvailability = async (a: string) => {
    Haptics.selectionAsync();
    try { await apiFetch("/pro/availability", { method: "PATCH", body: { availability: a } }); load(); }
    catch (e: any) { toast(e.message, "error"); }
  };
  const updateStatus = async (bid: string, status: string) => {
    setBusy(true);
    try { await apiFetch(`/bookings/${bid}/status`, { method: "PATCH", body: { status } }); toast("Updated", "success"); load(); }
    catch (e: any) { toast(e.message, "error"); } finally { setBusy(false); }
  };
  const completeWithPrice = async () => {
    if (!activeBid) return;
    setBusy(true);
    try {
      if (price) await apiFetch(`/bookings/${activeBid}/quote`, { method: "PATCH", body: { final_price: Number(price) } });
      await apiFetch(`/bookings/${activeBid}/status`, { method: "PATCH", body: { status: "work_completed" } });
      priceSheet.current?.close(); setPrice(""); toast("Job completed", "success"); load();
    } catch (e: any) { toast(e.message, "error"); } finally { setBusy(false); }
  };

  if (loading) return <View style={styles.container}><Loading /></View>;
  if (!data) return <View style={styles.container}><EmptyState title="Couldn't load dashboard" /></View>;

  const { profile, metrics, new_requests, active } = data;
  const pending = profile.verification_status !== "verified";

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brandPrimary} />}>
        <View style={styles.head}>
          <View>
            <Text style={styles.hi}>Hi, {user?.name?.split(" ")[0]}</Text>
            <Text style={styles.biz}>{profile.business_name}</Text>
          </View>
        </View>

        {pending && (
          <View style={styles.verifyBanner}>
            <Ionicons name="time" size={16} color={colors.warning} />
            <Text style={styles.verifyText}>Your account is {profile.verification_status}. You'll receive requests once verified by admin.</Text>
          </View>
        )}

        {/* Availability */}
        <View style={styles.availCard}>
          <Text style={styles.availTitle}>Your status</Text>
          <View style={styles.availRow}>
            {AV.map((a) => (
              <Pressable key={a.key} testID={`availability-${a.key}`} style={[styles.availPill, profile.availability === a.key && { backgroundColor: a.color }]} onPress={() => setAvailability(a.key)}>
                <Text style={[styles.availPillText, profile.availability === a.key && { color: "#fff" }]}>{a.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Metrics */}
        <View style={styles.metricsRow}>
          <View style={styles.metric}><Text style={styles.metricNum}>₹{metrics.today_earnings}</Text><Text style={styles.metricLabel}>Earnings</Text></View>
          <View style={styles.metric}><Text style={styles.metricNum}>{metrics.jobs_completed}</Text><Text style={styles.metricLabel}>Jobs done</Text></View>
        </View>
        <View style={styles.metricsRow}>
          <View style={styles.metric}><Text style={styles.metricNum}>{metrics.rating?.toFixed(1) || "—"}</Text><Text style={styles.metricLabel}>Rating</Text></View>
          <View style={styles.metric}><Text style={styles.metricNum}>{metrics.active_jobs}</Text><Text style={styles.metricLabel}>Active</Text></View>
        </View>

        {/* New requests */}
        <Text style={styles.sectionTitle}>New requests ({new_requests.length})</Text>
        {new_requests.length === 0 ? (
          <Text style={styles.emptyLine}>No new requests. Keep your status Available.</Text>
        ) : new_requests.map((b: any) => (
          <View key={b.id} style={styles.reqCard} testID={`request-${b.id}`}>
            <View style={styles.reqTop}>
              <Text style={styles.reqProblem} numberOfLines={2}>{b.problem_text}</Text>
              {b.urgency === "emergency" && <View style={styles.emgTag}><Text style={styles.emgTagText}>EMERGENCY</Text></View>}
            </View>
            <Text style={styles.reqMeta}><Ionicons name="location-outline" size={12} color={colors.onSurfaceTertiary} /> {b.address}</Text>
            <Text style={styles.reqMeta}>{b.scheduled_date} · {b.scheduled_time} · Est ₹{b.estimated_price_min}–₹{b.estimated_price_max}</Text>
            <View style={styles.reqActions}>
              <AppButton title="Decline" variant="secondary" testID={`decline-${b.id}`} onPress={() => updateStatus(b.id, "cancelled")} style={{ flex: 1, height: 44 }} />
              <AppButton title="Accept" testID={`accept-${b.id}`} onPress={() => updateStatus(b.id, "confirmed")} style={{ flex: 1, height: 44 }} loading={busy} />
            </View>
          </View>
        ))}

        {/* Active jobs */}
        <Text style={styles.sectionTitle}>Active jobs ({active.length})</Text>
        {active.length === 0 ? (
          <Text style={styles.emptyLine}>No active jobs right now.</Text>
        ) : active.map((b: any) => {
          const step = NEXT[b.status];
          return (
            <View key={b.id} style={styles.reqCard} testID={`active-${b.id}`}>
              <View style={styles.reqTop}>
                <Text style={styles.reqProblem} numberOfLines={1}>{b.problem_text}</Text>
                <StatusPill status={b.status} />
              </View>
              <Text style={styles.reqMeta}><Ionicons name="person-outline" size={12} color={colors.onSurfaceTertiary} /> {b.customer_name} · {b.address}</Text>
              <View style={styles.reqActions}>
                <Pressable style={styles.chatMini} testID={`chat-${b.id}`} onPress={() => router.push({ pathname: "/chat/[id]", params: { id: b.id } })}>
                  <Ionicons name="chatbubble-ellipses" size={18} color={colors.brandPrimary} />
                </Pressable>
                {step && (
                  <AppButton title={step.label} testID={`advance-${b.id}`} loading={busy}
                    onPress={() => { if (step.next === "work_completed") { setActiveBid(b.id); setPrice(String(b.final_price || b.estimated_price_max || "")); priceSheet.current?.expand(); } else updateStatus(b.id, step.next); }}
                    style={{ flex: 1, height: 44 }} />
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <BottomSheet ref={priceSheet} index={-1} snapPoints={[320]} enablePanDownToClose keyboardBehavior="interactive" backdropComponent={(p) => <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} />}>
        <BottomSheetView style={{ padding: spacing.xl }}>
          <Text style={styles.sheetTitle}>Set final price</Text>
          <Text style={styles.sheetSub}>The customer approves this at payment.</Text>
          <BottomSheetTextInput testID="final-price-input" value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="₹ amount" placeholderTextColor={colors.muted} style={styles.priceInput} />
          <AppButton title="Complete job" testID="complete-job-button" onPress={completeWithPrice} loading={busy} style={{ marginTop: spacing.md }} />
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceSecondary },
  head: { paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  hi: { fontSize: font.base, color: colors.onSurfaceTertiary },
  biz: { fontSize: font["2xl"], fontWeight: "700", color: colors.onSurface },
  verifyBanner: { flexDirection: "row", gap: spacing.sm, alignItems: "center", backgroundColor: "#FEF3C7", marginHorizontal: spacing.lg, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md },
  verifyText: { flex: 1, fontSize: font.sm, color: "#92400E" },
  availCard: { backgroundColor: colors.surface, marginHorizontal: spacing.lg, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, ...shadow.card },
  availTitle: { fontSize: font.base, fontWeight: "600", color: colors.onSurfaceSecondary, marginBottom: spacing.md },
  availRow: { flexDirection: "row", gap: spacing.sm },
  availPill: { flex: 1, height: 40, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceTertiary },
  availPillText: { fontSize: font.base, fontWeight: "600", color: colors.onSurfaceTertiary },
  metricsRow: { flexDirection: "row", gap: spacing.md, paddingHorizontal: spacing.lg, marginTop: spacing.md },
  metric: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, ...shadow.card },
  metricNum: { fontSize: font["2xl"], fontWeight: "700", color: colors.onSurface },
  metricLabel: { fontSize: font.sm, color: colors.onSurfaceTertiary, marginTop: 2 },
  sectionTitle: { fontSize: font.lg, fontWeight: "700", color: colors.onSurface, paddingHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.md },
  emptyLine: { fontSize: font.base, color: colors.onSurfaceTertiary, paddingHorizontal: spacing.lg },
  reqCard: { backgroundColor: colors.surface, marginHorizontal: spacing.lg, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadow.card },
  reqTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  reqProblem: { fontSize: font.base, fontWeight: "700", color: colors.onSurface, flex: 1 },
  reqMeta: { fontSize: font.sm, color: colors.onSurfaceTertiary, marginTop: 4 },
  reqActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md, alignItems: "center" },
  chatMini: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  emgTag: { backgroundColor: colors.error, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  emgTagText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  sheetTitle: { fontSize: font.xl, fontWeight: "700", color: colors.onSurface },
  sheetSub: { fontSize: font.base, color: colors.onSurfaceTertiary, marginTop: 4, marginBottom: spacing.lg },
  priceInput: { height: 56, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.lg, fontSize: font.xl, fontWeight: "700", color: colors.onSurface },
});
