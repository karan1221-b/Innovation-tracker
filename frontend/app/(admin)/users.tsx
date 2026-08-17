import { useCallback, useState } from "react";
import { StyleSheet, Text, View, FlatList, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/src/api";
import { Loading, EmptyState, AppButton, useToast } from "@/src/ui";
import { colors, spacing, font, radius, shadow } from "@/src/theme";

export default function AdminUsers() {
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setUsers(await apiFetch<any[]>("/admin/users")); } catch {} finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggle = async (id: string, disabled: boolean) => {
    try { await apiFetch(`/admin/users/${id}/suspend`, { method: "PATCH", body: { disabled } }); toast(disabled ? "User suspended" : "User reactivated", "success"); load(); }
    catch (e: any) { toast(e.message, "error"); }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}><Text style={styles.title}>Users</Text></View>
      {loading ? <Loading /> : users.length === 0 ? (
        <EmptyState icon="people-outline" title="No users yet" subtitle="Registered customers and pros show here." />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u) => u.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brandPrimary} />}
          renderItem={({ item }) => (
            <View style={styles.card} testID={`user-${item.id}`}>
              <View style={styles.avatar}><Ionicons name={item.role === "professional" ? "construct" : "person"} size={20} color={colors.brandPrimary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>{item.email} · {item.role}</Text>
              </View>
              <AppButton title={item.disabled ? "Reactivate" : "Suspend"} variant={item.disabled ? "primary" : "danger"} testID={`toggle-user-${item.id}`} onPress={() => toggle(item.id, !item.disabled)} style={{ paddingHorizontal: spacing.md, height: 40 }} />
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
  card: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border, ...shadow.card },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  name: { fontSize: font.base, fontWeight: "700", color: colors.onSurface },
  meta: { fontSize: font.sm, color: colors.onSurfaceTertiary, marginTop: 1, textTransform: "capitalize" },
});
