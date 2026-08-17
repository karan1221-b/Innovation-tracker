import { useEffect, useState, useCallback, useRef } from "react";
import { StyleSheet, Text, View, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { apiFetch } from "@/src/api";
import { Loading, ErrorState, AppButton, useToast } from "@/src/ui";
import { colors, spacing, font, radius, shadow } from "@/src/theme";

const STEPS = [
  { key: "requested", label: "Request Submitted", icon: "paper-plane" },
  { key: "confirmed", label: "Booking Confirmed", icon: "checkmark-circle" },
  { key: "on_the_way", label: "On The Way", icon: "car" },
  { key: "arrived", label: "Arrived", icon: "location" },
  { key: "work_started", label: "Work Started", icon: "construct" },
  { key: "work_completed", label: "Work Completed", icon: "checkmark-done" },
  { key: "paid", label: "Payment", icon: "card" },
  { key: "reviewed", label: "Review", icon: "star" },
];
const PAY_METHODS = [
  { key: "cash", label: "Cash", icon: "cash" },
  { key: "upi", label: "UPI", icon: "phone-portrait" },
  { key: "card", label: "Card", icon: "card" },
];

export default function BookingTracker() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [booking, setBooking] = useState<any>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const paySheet = useRef<BottomSheet>(null);
  const reviewSheet = useRef<BottomSheet>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch(`/bookings/${id}`);
      setBooking(data);
      setStatus("ok");
    } catch { setStatus("error"); }
  }, [id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(load, 8000); // light polling for status updates
    return () => clearInterval(t);
  }, [load]);

  if (status === "loading") return <Loading />;
  if (status === "error" || !booking) return <ErrorState onRetry={load} />;

  const cancelled = booking.status === "cancelled";
  const currentIdx = STEPS.findIndex((s) => s.key === booking.status);
  const pro = booking.professional || {};
  const amount = booking.final_price || booking.estimated_price_max || 0;

  const pay = async (method: string) => {
    setBusy(true);
    try {
      await apiFetch(`/bookings/${id}/pay`, { method: "POST", body: { method } });
      paySheet.current?.close();
      toast(method === "cash" ? "Marked as paid" : "Payment recorded", "success");
      load();
    } catch (e: any) { toast(e.message, "error"); } finally { setBusy(false); }
  };
  const submitReview = async () => {
    setBusy(true);
    try {
      await apiFetch(`/bookings/${id}/review`, { method: "POST", body: { rating, comment } });
      reviewSheet.current?.close();
      toast("Thanks for your review!", "success");
      load();
    } catch (e: any) { toast(e.message, "error"); } finally { setBusy(false); }
  };
  const cancel = async () => {
    setBusy(true);
    try {
      await apiFetch(`/bookings/${id}/status`, { method: "PATCH", body: { status: "cancelled", note: "Cancelled by customer" } });
      toast("Booking cancelled", "info");
      load();
    } catch (e: any) { toast(e.message, "error"); } finally { setBusy(false); }
  };

  return (
    <View style={styles.container}>
      {/* Map preview */}
      <View style={styles.map}>
        <Image source={{ uri: "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&q=70" }} style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient colors={["rgba(31,41,55,0.55)", "transparent", "rgba(249,250,251,1)"]} style={StyleSheet.absoluteFill} />
        <Pressable testID="tracker-back" onPress={() => router.replace("/(customer)/bookings")} style={[styles.backBtn, { top: insets.top + spacing.sm }]}><Ionicons name="chevron-back" size={24} color={colors.onSurface} /></Pressable>
        <View style={[styles.mapPin, { top: insets.top + 60 }]}><Ionicons name="location" size={18} color="#fff" /></View>
      </View>

      <ScrollView style={styles.sheet} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        {cancelled && (
          <View style={styles.cancelBanner}><Ionicons name="close-circle" size={18} color={colors.error} /><Text style={styles.cancelText}>This booking was cancelled.</Text></View>
        )}
        <View style={styles.proRow}>
          <Image source={{ uri: pro.photo_url }} style={styles.proAvatar} contentFit="cover" placeholder={colors.surfaceTertiary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.proName}>{pro.business_name || "Professional"}</Text>
            <Text style={styles.problemText} numberOfLines={2}>{booking.problem_text}</Text>
          </View>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>{booking.final_price ? "Final price" : "Estimated price"}</Text>
          <Text style={styles.priceVal}>{booking.final_price ? `₹${booking.final_price}` : `₹${booking.estimated_price_min}–₹${booking.estimated_price_max}`}</Text>
        </View>

        {/* Timeline */}
        <Text style={styles.timelineTitle}>Status</Text>
        <View style={styles.timeline}>
          {STEPS.map((step, i) => {
            const done = !cancelled && i <= currentIdx;
            const active = !cancelled && i === currentIdx;
            return (
              <View key={step.key} style={styles.tlRow}>
                <View style={styles.tlLeft}>
                  <View style={[styles.tlDot, done && styles.tlDotDone, active && styles.tlDotActive]}>
                    <Ionicons name={step.icon as any} size={14} color={done ? "#fff" : colors.muted} />
                  </View>
                  {i < STEPS.length - 1 && <View style={[styles.tlLine, done && i < currentIdx && styles.tlLineDone]} />}
                </View>
                <Text style={[styles.tlLabel, done && { color: colors.onSurface, fontWeight: "600" }]}>{step.label}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Sticky actions */}
      {!cancelled && (
        <View style={[styles.actionBar, { paddingBottom: insets.bottom + spacing.md }]}>
          <Pressable testID="contact-pro-button" style={styles.contactBtn} onPress={() => router.push({ pathname: "/chat/[id]", params: { id: booking.id } })}>
            <Ionicons name="chatbubble-ellipses" size={18} color={colors.brandPrimary} />
            <Text style={styles.contactText}>Contact Pro</Text>
          </Pressable>
          {booking.status === "work_completed" && booking.payment_status === "pending" && (
            <AppButton title={`Pay ₹${amount}`} testID="pay-button" onPress={() => paySheet.current?.expand()} style={{ flex: 1 }} />
          )}
          {booking.status === "paid" && !booking.review_id && (
            <AppButton title="Leave a Review" testID="review-button" onPress={() => reviewSheet.current?.expand()} style={{ flex: 1 }} />
          )}
          {["requested", "confirmed", "on_the_way"].includes(booking.status) && (
            <AppButton title="Cancel" variant="danger" testID="cancel-booking-button" onPress={cancel} loading={busy} style={{ flex: 1 }} />
          )}
        </View>
      )}

      {/* Payment sheet */}
      <BottomSheet ref={paySheet} index={-1} snapPoints={[360]} enablePanDownToClose backdropComponent={(p) => <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} />}>
        <BottomSheetView style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Choose payment method</Text>
          <Text style={styles.sheetSub}>Amount payable: ₹{amount}</Text>
          {PAY_METHODS.map((m) => (
            <Pressable key={m.key} testID={`pay-method-${m.key}`} style={styles.payOption} onPress={() => pay(m.key)} disabled={busy}>
              <Ionicons name={m.icon as any} size={20} color={colors.brandPrimary} />
              <Text style={styles.payOptionText}>{m.label}</Text>
              {m.key !== "cash" && <Text style={styles.pendingTag}>Gateway pending</Text>}
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          ))}
          <Text style={styles.gatewayNote}>Card/UPI online payments will be enabled once a payment gateway is configured. Cash is fully functional.</Text>
        </BottomSheetView>
      </BottomSheet>

      {/* Review sheet */}
      <BottomSheet ref={reviewSheet} index={-1} snapPoints={[400]} enablePanDownToClose keyboardBehavior="interactive" backdropComponent={(p) => <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} />}>
        <BottomSheetView style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Rate your experience</Text>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} testID={`star-${n}`} onPress={() => setRating(n)}>
                <Ionicons name={n <= rating ? "star" : "star-outline"} size={36} color={colors.warning} />
              </Pressable>
            ))}
          </View>
          <ReviewInput value={comment} onChange={setComment} />
          <AppButton title="Submit review" testID="submit-review-button" onPress={submitReview} loading={busy} style={{ marginTop: spacing.md }} />
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
function ReviewInput({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  return (
    <BottomSheetTextInput
      testID="review-comment-input"
      value={value}
      onChangeText={onChange}
      placeholder="Share details about the service…"
      placeholderTextColor={colors.muted}
      multiline
      style={styles.reviewInput}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceSecondary },
  map: { height: 240 },
  backBtn: { position: "absolute", left: spacing.lg, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center" },
  mapPin: { position: "absolute", alignSelf: "center", width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", ...shadow.raised },
  sheet: { flex: 1, marginTop: -24, backgroundColor: colors.surfaceSecondary, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: spacing.lg, paddingHorizontal: spacing.lg },
  cancelBanner: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: "#FEF2F2", padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md },
  cancelText: { color: colors.error, fontWeight: "600" },
  proRow: { flexDirection: "row", gap: spacing.md, backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, ...shadow.card },
  proAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.surfaceTertiary },
  proName: { fontSize: font.lg, fontWeight: "700", color: colors.onSurface },
  problemText: { fontSize: font.sm, color: colors.onSurfaceTertiary, marginTop: 2 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.lg, marginTop: spacing.md, ...shadow.card },
  priceLabel: { fontSize: font.base, color: colors.onSurfaceTertiary },
  priceVal: { fontSize: font.lg, fontWeight: "700", color: colors.brandPrimary },
  timelineTitle: { fontSize: font.lg, fontWeight: "700", color: colors.onSurface, marginTop: spacing.xl, marginBottom: spacing.md },
  timeline: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, ...shadow.card },
  tlRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  tlLeft: { alignItems: "center" },
  tlDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  tlDotDone: { backgroundColor: colors.brandPrimary },
  tlDotActive: { backgroundColor: colors.brandSecondary },
  tlLine: { width: 2, height: 20, backgroundColor: colors.border, marginVertical: 2 },
  tlLineDone: { backgroundColor: colors.brandPrimary },
  tlLabel: { fontSize: font.base, color: colors.onSurfaceTertiary, paddingTop: 6 },
  actionBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", gap: spacing.md, padding: spacing.lg, backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  contactBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 52, paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary, borderWidth: 1.5, borderColor: colors.brandPrimary },
  contactText: { color: colors.brandPrimary, fontWeight: "600", fontSize: font.base },
  sheetContent: { padding: spacing.xl },
  sheetTitle: { fontSize: font.xl, fontWeight: "700", color: colors.onSurface },
  sheetSub: { fontSize: font.base, color: colors.onSurfaceTertiary, marginTop: 4, marginBottom: spacing.lg },
  payOption: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, marginBottom: spacing.sm },
  payOptionText: { fontSize: font.lg, fontWeight: "600", color: colors.onSurface, flex: 1 },
  pendingTag: { fontSize: font.sm, color: colors.warning, marginRight: spacing.sm },
  gatewayNote: { fontSize: font.sm, color: colors.onSurfaceTertiary, marginTop: spacing.sm, lineHeight: 18 },
  starRow: { flexDirection: "row", justifyContent: "center", gap: spacing.md, marginVertical: spacing.lg },
  reviewInput: { minHeight: 80, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: font.base, color: colors.onSurface, textAlignVertical: "top" },
});
