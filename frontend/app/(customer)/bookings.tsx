import { useCallback, useState } from "react";
import { StyleSheet, Text, View, Pressable, FlatList, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/src/api";
import { Loading, EmptyState, AppButton } from "@/src/ui";
import { StatusPill } from "@/src/status";
import { colors, spacing, font, radius, shadow } from "@/src/theme";

export default function Bookings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<any[]>("/bookings");
      setBookings(data);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const renderItem = ({ item }: { item: any }) => (
    <Pressable testID={`booking-${item.id}`} style={styles.card} onPress={() => router.push({ pathname: "/booking/[id]", params: { id: item.id } })}>
      <Image source={{ uri: item.professional?.photo_url }} style={styles.avatar} contentFit="cover" placeholder={colors.surfaceTertiary} />
      <View style={{ flex: 1 }}>
        <View style={styles.topRow}>
          <Text style={styles.proName} numberOfLines={1}>{item.professional?.business_name || "Professional"}</Text>
          <StatusPill status={item.status} />
        </View>
        <Text style={styles.problem} numberOfLines={1}>{item.problem_text}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={13} color={colors.onSurfaceTertiary} />
          <Text style={styles.meta}>{item.scheduled_date} · {item.scheduled_time}</Text>
        </View>
      </View>
    </Pressable>
  );

  if (loading) return <View style={styles.container}><Loading /></View>;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}><Text style={styles.title}>My Bookings</Text></View>
      {bookings.length === 0 ? (
        <EmptyState icon="receipt-outline" title="No bookings yet" subtitle="Describe a problem on Home to book your first pro."
          action={<AppButton title="Go to Home" onPress={() => router.push("/(customer)/home")} />} />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(b) => b.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brandPrimary} />}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceSecondary },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  title: { fontSize: font["2xl"], fontWeight: "700", color: colors.onSurface },
  card: { flexDirection: "row", gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadow.card },
  avatar: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.surfaceTertiary },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  proName: { fontSize: font.base, fontWeight: "700", color: colors.onSurface, flex: 1 },
  problem: { fontSize: font.sm, color: colors.onSurfaceSecondary, marginTop: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  meta: { fontSize: font.sm, color: colors.onSurfaceTertiary },
});
