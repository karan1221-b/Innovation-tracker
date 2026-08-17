import { useCallback, useState } from "react";
import { StyleSheet, Text, View, Pressable, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/src/api";
import { Loading, EmptyState } from "@/src/ui";
import { colors, spacing, font, radius } from "@/src/theme";

const ICONS: Record<string, string> = { booking: "receipt", message: "chatbubble-ellipses", price: "cash", account: "shield-checkmark", info: "information-circle" };

export default function Notifications() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setNotes(await apiFetch<any[]>("/notifications")); } catch {} finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const markRead = async (id: string) => {
    setNotes((n) => n.map((x) => (x.id === id ? { ...x, read: true } : x)));
    try { await apiFetch(`/notifications/${id}/read`, { method: "PATCH" }); } catch {}
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="notif-back" onPress={() => router.back()} hitSlop={10}><Ionicons name="chevron-back" size={26} color={colors.onSurface} /></Pressable>
        <Text style={styles.title}>Notifications</Text>
        <View style={{ width: 26 }} />
      </View>
      {loading ? <Loading /> : notes.length === 0 ? (
        <EmptyState icon="notifications-outline" title="No notifications" subtitle="Updates about your bookings will show up here." />
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ padding: spacing.lg }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable testID={`notif-${item.id}`} style={[styles.row, !item.read && styles.unread]} onPress={() => markRead(item.id)}>
              <View style={styles.icon}><Ionicons name={(ICONS[item.type] || "information-circle") as any} size={18} color={colors.brandPrimary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.noteTitle}>{item.title}</Text>
                <Text style={styles.noteBody}>{item.body}</Text>
              </View>
              {!item.read && <View style={styles.dot} />}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceSecondary },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  title: { fontSize: font.lg, fontWeight: "700", color: colors.onSurface },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  unread: { backgroundColor: "#F0FDFA", borderColor: colors.brandTertiary },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  noteTitle: { fontSize: font.base, fontWeight: "700", color: colors.onSurface },
  noteBody: { fontSize: font.sm, color: colors.onSurfaceSecondary, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brandPrimary },
});
