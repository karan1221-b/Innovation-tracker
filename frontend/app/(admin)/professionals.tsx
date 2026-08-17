import { useCallback, useState } from "react";
import { StyleSheet, Text, View, Pressable, FlatList, ScrollView, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/src/api";
import { Loading, EmptyState, AppButton, useToast } from "@/src/ui";
import { colors, spacing, font, radius, shadow } from "@/src/theme";

const FILTERS = ["pending", "verified", "rejected", "suspended", "all"];

export default function AdminPros() {
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [pros, setPros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("pending");

  const load = useCallback(async () => {
    try {
      const q = filter === "all" ? "" : `?status=${filter}`;
      setPros(await apiFetch<any[]>(`/admin/professionals${q}`));
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, [filter]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const verify = async (id: string, status: string) => {
    try { await apiFetch(`/admin/professionals/${id}/verify`, { method: "PATCH", body: { status } }); toast(`Marked ${status}`, "success"); load(); }
    catch (e: any) { toast(e.message, "error"); }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.title}>Professionals</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingTop: spacing.md }}>
          {FILTERS.map((f) => (
            <Pressable key={f} testID={`profilter-${f}`} onPress={() => setFilter(f)} style={[styles.chip, filter === f && styles.chipActive]}>
              <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{f}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {loading ? <Loading /> : pros.length === 0 ? (
        <EmptyState icon="shield-outline" title="No professionals" subtitle={`No ${filter} professionals right now.`} />
      ) : (
        <FlatList
          data={pros}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brandPrimary} />}
          renderItem={({ item }) => (
            <View style={styles.card} testID={`adminpro-${item.id}`}>
              <View style={styles.top}>
                <Image source={{ uri: item.photo_url }} style={styles.avatar} contentFit="cover" placeholder={colors.surfaceTertiary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.business_name}</Text>
                  <Text style={styles.meta}>{item.name} · {item.category?.replace(/_/g, " ")}</Text>
                  <Text style={styles.meta}>{item.is_demo ? "Demo account" : "Real account"} · {item.experience_years} yrs</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: item.verification_status === "verified" ? colors.brandTertiary : "#FEF3C7" }]}>
                  <Text style={[styles.statusText, { color: item.verification_status === "verified" ? colors.brandPrimary : "#92400E" }]}>{item.verification_status}</Text>
                </View>
              </View>
              <View style={styles.actions}>
                {item.verification_status !== "verified" && <AppButton title="Verify" testID={`verify-${item.id}`} onPress={() => verify(item.id, "verified")} style={{ flex: 1, height: 40 }} />}
                {item.verification_status !== "rejected" && <AppButton title="Reject" variant="secondary" testID={`reject-${item.id}`} onPress={() => verify(item.id, "rejected")} style={{ flex: 1, height: 40 }} />}
                {item.verification_status === "verified" && <AppButton title="Suspend" variant="danger" testID={`suspend-${item.id}`} onPress={() => verify(item.id, "suspended")} style={{ flex: 1, height: 40 }} />}
              </View>
            </View>
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
  chipText: { fontSize: font.sm, color: colors.onSurfaceTertiary, fontWeight: "600", textTransform: "capitalize" },
  chipTextActive: { color: "#fff" },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadow.card },
  top: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  avatar: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.surfaceTertiary },
  name: { fontSize: font.base, fontWeight: "700", color: colors.onSurface },
  meta: { fontSize: font.sm, color: colors.onSurfaceTertiary, marginTop: 1, textTransform: "capitalize" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  statusText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
});
