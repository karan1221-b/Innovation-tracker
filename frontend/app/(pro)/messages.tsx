import { useCallback, useState } from "react";
import { StyleSheet, Text, View, Pressable, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/src/api";
import { Loading, EmptyState } from "@/src/ui";
import { colors, spacing, font, radius, shadow } from "@/src/theme";

export default function ProMessages() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<any[]>("/bookings");
      setBookings(data.filter((b) => b.status !== "cancelled" && b.status !== "requested"));
    } catch {} finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <View style={styles.container}><Loading /></View>;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}><Text style={styles.title}>Messages</Text></View>
      {bookings.length === 0 ? (
        <EmptyState icon="chatbubbles-outline" title="No conversations" subtitle="Chat with customers once you accept a job." />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable testID={`pro-chat-${item.id}`} style={styles.row} onPress={() => router.push({ pathname: "/chat/[id]", params: { id: item.id } })}>
              <View style={styles.avatar}><Ionicons name="person" size={22} color={colors.brandPrimary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{item.customer_name || "Customer"}</Text>
                <Text style={styles.sub} numberOfLines={1}>{item.problem_text}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
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
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border, ...shadow.card },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  name: { fontSize: font.base, fontWeight: "700", color: colors.onSurface },
  sub: { fontSize: font.sm, color: colors.onSurfaceTertiary, marginTop: 2 },
});
