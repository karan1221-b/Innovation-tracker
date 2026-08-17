import { useCallback, useState } from "react";
import { StyleSheet, Text, View, Pressable, FlatList, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/src/api";
import { Loading, EmptyState } from "@/src/ui";
import { StatusPill } from "@/src/status";
import { colors, spacing, font, radius, shadow } from "@/src/theme";

const FILTERS = ["all", "requested", "active", "completed"];

export default function Schedule() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    try { setBookings(await apiFetch<any[]>("/bookings")); } catch {} finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = bookings.filter((b) => {
    if (filter === "all") return true;
    if (filter === "requested") return b.status === "requested";
    if (filter === "active") return ["confirmed", "on_the_way", "arrived", "work_started"].includes(b.status);
    if (filter === "completed") return ["work_completed", "paid", "reviewed"].includes(b.status);
    return true;
  });

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.title}>My Jobs</Text>
        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={(f) => f}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm, paddingTop: spacing.md }}
          renderItem={({ item }) => (
            <Pressable testID={`filter-${item}`} onPress={() => setFilter(item)} style={[styles.chip, filter === item && styles.chipActive]}>
              <Text style={[styles.chipText, filter === item && styles.chipTextActive]}>{item.charAt(0).toUpperCase() + item.slice(1)}</Text>
            </Pressable>
          )}
        />
      </View>
      {loading ? <Loading /> : filtered.length === 0 ? (
        <EmptyState icon="briefcase-outline" title="No jobs here" subtitle="Jobs will appear as customers book you." />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brandPrimary} />}
          renderItem={({ item }) => (
            <Pressable testID={`job-${item.id}`} style={styles.card} onPress={() => router.push({ pathname: "/chat/[id]", params: { id: item.id } })}>
              <View style={styles.topRow}>
                <Text style={styles.problem} numberOfLines={1}>{item.problem_text}</Text>
                <StatusPill status={item.status} />
              </View>
              <Text style={styles.meta}>{item.customer_name} · {item.scheduled_date} {item.scheduled_time}</Text>
              <Text style={styles.meta}><Ionicons name="location-outline" size={12} color={colors.onSurfaceTertiary} /> {item.address}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceSecondary },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  title: { fontSize: font["2xl"], fontWeight: "700", color: colors.onSurface },
  chip: { flexShrink: 0, paddingHorizontal: spacing.lg, height: 36, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  chipActive: { borderColor: colors.brandPrimary, backgroundColor: colors.brandPrimary },
  chipText: { fontSize: font.sm, color: colors.onSurfaceTertiary, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadow.card },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  problem: { fontSize: font.base, fontWeight: "700", color: colors.onSurface, flex: 1 },
  meta: { fontSize: font.sm, color: colors.onSurfaceTertiary, marginTop: 4 },
});
