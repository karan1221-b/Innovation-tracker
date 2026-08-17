import { StyleSheet, Text, View } from "react-native";
import { radius } from "@/src/theme";

export const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  requested: { label: "Requested", color: "#B45309", bg: "#FEF3C7" },
  confirmed: { label: "Confirmed", color: "#0F766E", bg: "#CCFBF1" },
  on_the_way: { label: "On the way", color: "#1D4ED8", bg: "#DBEAFE" },
  arrived: { label: "Arrived", color: "#1D4ED8", bg: "#DBEAFE" },
  work_started: { label: "In progress", color: "#7C3AED", bg: "#EDE9FE" },
  work_completed: { label: "Completed", color: "#047857", bg: "#D1FAE5" },
  paid: { label: "Paid", color: "#047857", bg: "#D1FAE5" },
  reviewed: { label: "Reviewed", color: "#047857", bg: "#D1FAE5" },
  cancelled: { label: "Cancelled", color: "#B91C1C", bg: "#FEE2E2" },
};

export function StatusPill({ status }: { status: string }) {
  const m = STATUS_META[status] || STATUS_META.requested;
  return (
    <View style={[styles.pill, { backgroundColor: m.bg }]}>
      <Text style={[styles.text, { color: m.color }]}>{m.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  text: { fontSize: 12, fontWeight: "700" },
});
