import { useEffect, useState, useCallback } from "react";
import { StyleSheet, Text, View, Pressable, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/src/api";
import { Loading, EmptyState, ErrorState, VerifiedBadge, AppButton } from "@/src/ui";
import { colors, spacing, font, radius, shadow } from "@/src/theme";

type Pro = {
  id: string; name: string; business_name: string; category: string;
  rating: number; jobs_completed: number; distance_km: number; eta_minutes: number;
  price_min: number; price_max: number; availability: string; verification_status: string;
  photo_url: string; skills: string[]; experience_years: number; response_time_minutes: number;
};

export default function Matches() {
  const params = useLocalSearchParams<{ category: string; category_name: string; summary: string; problem_text: string; urgency: string; media: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [pros, setPros] = useState<Pro[]>([]);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const isEmergency = params.urgency === "emergency";

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const q = params.category ? `?category=${params.category}&urgency=${params.urgency}` : `?urgency=${params.urgency}`;
      const data = await apiFetch<Pro[]>(`/professionals${q}`);
      setPros(data);
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }, [params.category, params.urgency]);
  useEffect(() => { load(); }, [load]);

  const book = (pro: Pro) => {
    router.push({
      pathname: "/book",
      params: {
        professional_id: pro.id, pro_name: pro.business_name, category: pro.category || params.category || "other",
        price_min: String(pro.price_min), price_max: String(pro.price_max),
        problem_text: params.problem_text || "", urgency: params.urgency, media: params.media || "[]",
      },
    });
  };

  const renderCard = ({ item }: { item: Pro }) => (
    <Pressable style={styles.card} testID={`pro-card-${item.id}`} onPress={() => router.push({ pathname: "/professional/[id]", params: { id: item.id, problem_text: params.problem_text || "", urgency: params.urgency, media: params.media || "[]" } })}>
      <View style={styles.cardTop}>
        <Image source={{ uri: item.photo_url }} style={styles.avatar} contentFit="cover" placeholder={colors.surfaceTertiary} />
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.proName} numberOfLines={1}>{item.business_name}</Text>
            <VerifiedBadge status={item.verification_status} />
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="star" size={13} color={colors.warning} />
            <Text style={styles.metaStrong}>{item.rating.toFixed(1)}</Text>
            <Text style={styles.metaDim}>· {item.jobs_completed.toLocaleString()} jobs</Text>
          </View>
          <Text style={styles.exp}>{item.experience_years} yrs exp · {item.name}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoChip}><Ionicons name="location-outline" size={13} color={colors.onSurfaceTertiary} /><Text style={styles.infoText}>{item.distance_km} km</Text></View>
        <View style={styles.infoChip}><Ionicons name="time-outline" size={13} color={colors.onSurfaceTertiary} /><Text style={styles.infoText}>~{item.eta_minutes} min</Text></View>
        <View style={styles.infoChip}>
          <View style={[styles.dot, { backgroundColor: item.availability === "available" ? colors.success : item.availability === "busy" ? colors.warning : colors.muted }]} />
          <Text style={styles.infoText}>{item.availability}</Text>
        </View>
      </View>

      <View style={styles.cardBottom}>
        <View>
          <Text style={styles.priceLabel}>Estimated price</Text>
          <Text style={styles.price}>₹{item.price_min}–₹{item.price_max}</Text>
        </View>
        <AppButton title="Book" testID={`book-button-${item.id}`} onPress={() => book(item)} style={{ paddingHorizontal: spacing.xl, height: 44 }} />
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {/* Sticky glass header */}
      <BlurView intensity={80} tint="light" style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="matches-back" onPress={() => router.back()} hitSlop={10}><Ionicons name="chevron-back" size={26} color={colors.onSurface} /></Pressable>
        <View style={styles.headerCenter}>
          {isEmergency && <View style={styles.emgTag}><Ionicons name="alert" size={11} color="#fff" /><Text style={styles.emgTagText}>EMERGENCY</Text></View>}
          <Text style={styles.headerTitle} numberOfLines={1}>{params.category_name || "Professionals"}</Text>
          {!!params.summary && <Text style={styles.headerSub} numberOfLines={1}>{params.summary}</Text>}
        </View>
        <Pressable testID="edit-problem" onPress={() => router.back()}><Text style={styles.edit}>Edit</Text></Pressable>
      </BlurView>

      {status === "loading" ? (
        <Loading label="Finding the best pros for you…" />
      ) : status === "error" ? (
        <ErrorState message="Unable to fetch professionals" onRetry={load} />
      ) : pros.length === 0 ? (
        <EmptyState icon="cube-outline" title="No professionals available right now" subtitle="Try again shortly or expand your search area."
          action={<AppButton title="Go back" variant="outline" onPress={() => router.back()} />} />
      ) : (
        <>
          {isEmergency && (
            <View style={styles.emgNotice}>
              <Ionicons name="information-circle" size={15} color={colors.error} />
              <Text style={styles.emgNoticeText}>Emergency service may include additional charges. Sorted by fastest arrival.</Text>
            </View>
          )}
          <FlatList
            data={pros}
            keyExtractor={(p) => p.id}
            renderItem={renderCard}
            contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + 78, paddingBottom: insets.bottom + spacing.xl }}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceSecondary },
  header: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, gap: spacing.md },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: font.lg, fontWeight: "700", color: colors.onSurface },
  headerSub: { fontSize: font.sm, color: colors.onSurfaceTertiary },
  edit: { fontSize: font.base, color: colors.brandPrimary, fontWeight: "600" },
  emgTag: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: colors.error, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, marginBottom: 2 },
  emgTagText: { color: "#fff", fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  emgNotice: { flexDirection: "row", gap: spacing.sm, alignItems: "center", backgroundColor: "#FEF2F2", marginHorizontal: spacing.lg, marginTop: 82, padding: spacing.md, borderRadius: radius.md },
  emgNoticeText: { flex: 1, fontSize: font.sm, color: "#B91C1C" },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadow.card },
  cardTop: { flexDirection: "row", gap: spacing.md },
  avatar: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.surfaceTertiary },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  proName: { fontSize: font.lg, fontWeight: "700", color: colors.onSurface, flexShrink: 1 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3 },
  metaStrong: { fontSize: font.sm, fontWeight: "700", color: colors.onSurface },
  metaDim: { fontSize: font.sm, color: colors.onSurfaceTertiary },
  exp: { fontSize: font.sm, color: colors.onSurfaceTertiary, marginTop: 2 },
  infoRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  infoChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.surfaceTertiary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  infoText: { fontSize: font.sm, color: colors.onSurfaceSecondary, fontWeight: "500", textTransform: "capitalize" },
  dot: { width: 7, height: 7, borderRadius: 4 },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
  priceLabel: { fontSize: font.sm, color: colors.onSurfaceTertiary },
  price: { fontSize: font.lg, fontWeight: "700", color: colors.onSurface },
});
