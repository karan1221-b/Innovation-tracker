import { useEffect, useState, useCallback } from "react";
import { StyleSheet, Text, View, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/src/api";
import { Loading, ErrorState, VerifiedBadge, AppButton, Tag } from "@/src/ui";
import { colors, spacing, font, radius, shadow } from "@/src/theme";

export default function ProfessionalDetail() {
  const params = useLocalSearchParams<{ id: string; problem_text: string; urgency: string; media: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [pro, setPro] = useState<any>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const data = await apiFetch(`/professionals/${params.id}`);
      setPro(data);
      setStatus("ok");
    } catch { setStatus("error"); }
  }, [params.id]);
  useEffect(() => { load(); }, [load]);

  if (status === "loading") return <Loading />;
  if (status === "error" || !pro) return <ErrorState onRetry={load} />;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={[styles.hero, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable testID="pro-detail-back" onPress={() => router.back()} style={styles.backBtn} hitSlop={10}><Ionicons name="chevron-back" size={24} color={colors.onSurface} /></Pressable>
          <Image source={{ uri: pro.photo_url }} style={styles.bigAvatar} contentFit="cover" placeholder={colors.surfaceTertiary} />
          <View style={styles.nameRow}>
            <Text style={styles.name}>{pro.business_name}</Text>
            <VerifiedBadge status={pro.verification_status} />
          </View>
          <Text style={styles.sub}>{pro.name} · {pro.experience_years} yrs experience</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}><Text style={styles.statNum}>{pro.rating?.toFixed(1)}</Text><Text style={styles.statLabel}>Rating</Text></View>
            <View style={styles.statDivider} />
            <View style={styles.stat}><Text style={styles.statNum}>{pro.jobs_completed?.toLocaleString()}</Text><Text style={styles.statLabel}>Jobs</Text></View>
            <View style={styles.statDivider} />
            <View style={styles.stat}><Text style={styles.statNum}>{pro.eta_minutes}m</Text><Text style={styles.statLabel}>ETA</Text></View>
          </View>
        </View>

        <View style={styles.body}>
          {!!pro.description && <><Text style={styles.h}>About</Text><Text style={styles.p}>{pro.description}</Text></>}

          <Text style={styles.h}>Skills</Text>
          <View style={styles.tags}>{(pro.skills || []).map((s: string, i: number) => <Tag key={i} label={s} />)}</View>

          <View style={styles.rowCard}>
            <Ionicons name="location-outline" size={18} color={colors.brandPrimary} />
            <Text style={styles.rowCardText}>Serves {pro.service_area || "your area"} · {pro.distance_km} km away</Text>
          </View>
          <View style={styles.rowCard}>
            <Ionicons name="cash-outline" size={18} color={colors.brandPrimary} />
            <Text style={styles.rowCardText}>Estimated ₹{pro.price_min}–₹{pro.price_max} (final confirmed on site)</Text>
          </View>

          <Text style={styles.h}>Reviews ({(pro.reviews || []).length})</Text>
          {(pro.reviews || []).length === 0 ? (
            <Text style={styles.p}>No reviews yet.</Text>
          ) : (
            (pro.reviews || []).map((r: any) => (
              <View key={r.id} style={styles.review}>
                <View style={styles.reviewHead}>
                  <Text style={styles.reviewName}>{r.customer_name || "Customer"}</Text>
                  <View style={styles.stars}>{[1,2,3,4,5].map((n) => <Ionicons key={n} name="star" size={12} color={n <= r.rating ? colors.warning : colors.border} />)}</View>
                </View>
                {!!r.comment && <Text style={styles.reviewText}>{r.comment}</Text>}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <View style={[styles.cta, { paddingBottom: insets.bottom + spacing.md }]}>
        <AppButton title="Book Now" testID="pro-detail-book" onPress={() => router.push({
          pathname: "/book",
          params: { professional_id: pro.id, pro_name: pro.business_name, category: pro.category,
            price_min: String(pro.price_min), price_max: String(pro.price_max),
            problem_text: params.problem_text || "", urgency: params.urgency || "normal", media: params.media || "[]" },
        })} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  hero: { backgroundColor: colors.brandTertiary, alignItems: "center", paddingBottom: spacing.xl, paddingHorizontal: spacing.xl },
  backBtn: { position: "absolute", left: spacing.lg, top: spacing.sm, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.8)", alignItems: "center", justifyContent: "center", zIndex: 2 },
  bigAvatar: { width: 92, height: 92, borderRadius: 46, backgroundColor: colors.surfaceTertiary, marginTop: spacing.md, borderWidth: 3, borderColor: "#fff" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md },
  name: { fontSize: font.xl, fontWeight: "700", color: colors.onSurface },
  sub: { fontSize: font.base, color: colors.onBrandTertiary, marginTop: 2 },
  statsRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: radius.lg, paddingVertical: spacing.md, paddingHorizontal: spacing.md, marginTop: spacing.lg, alignSelf: "stretch", ...shadow.card },
  stat: { alignItems: "center", flex: 1 },
  statNum: { fontSize: font.lg, fontWeight: "700", color: colors.onSurface },
  statLabel: { fontSize: font.sm, color: colors.onSurfaceTertiary, marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: colors.border },
  body: { padding: spacing.xl },
  h: { fontSize: font.lg, fontWeight: "700", color: colors.onSurface, marginTop: spacing.lg, marginBottom: spacing.sm },
  p: { fontSize: font.base, color: colors.onSurfaceSecondary, lineHeight: 22 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  rowCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceSecondary, padding: spacing.md, borderRadius: radius.md, marginTop: spacing.md },
  rowCardText: { flex: 1, fontSize: font.base, color: colors.onSurfaceSecondary },
  review: { backgroundColor: colors.surfaceSecondary, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm },
  reviewHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  reviewName: { fontSize: font.base, fontWeight: "600", color: colors.onSurface },
  stars: { flexDirection: "row", gap: 1 },
  reviewText: { fontSize: font.sm, color: colors.onSurfaceSecondary, marginTop: 4, lineHeight: 19 },
  cta: { position: "absolute", bottom: 0, left: 0, right: 0, padding: spacing.lg, backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
