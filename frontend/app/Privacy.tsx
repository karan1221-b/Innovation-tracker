import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, font, radius } from "@/src/theme";

export default function PrivacyData() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="chevron-back" size={24} color={colors.onSurface} /></Pressable>
          <Text style={styles.title}>Privacy & data</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.updated}>Privacy information for FixIt</Text>
          <Text style={styles.body}>FixIt collects information needed to create your account, connect you with service professionals, arrange bookings and communicate about requested services.</Text>

          <Section title="Information we may collect" items={[
            "Account information such as your name, email address and phone number.",
            "Service request information, including problem descriptions, booking details and addresses you provide.",
            "Photos or other files that you choose to upload with a service request.",
            "Messages, reviews, notifications and booking history generated through the service.",
            "Professional profile information when you register as a service professional."
          ]} />

          <Section title="How we use information" items={[
            "To authenticate and maintain your account.",
            "To match customers with relevant service professionals and manage bookings.",
            "To provide service-related communication, notifications and support.",
            "To protect the service, investigate misuse and maintain reliable operation."
          ]} />

          <Section title="Who may receive information" items={[
            "Information is shared with the service professional when it is necessary to fulfil a customer's request or booking.",
            "Information may be processed by infrastructure, hosting, analytics, payment or communication providers used to operate FixIt, where applicable.",
            "We do not intend to make a user's private account information publicly searchable."
          ]} />

          <Section title="Your controls" items={[
            "You can update your name and phone number from your profile.",
            "You can delete your FixIt account from Profile → Delete my account.",
            "Account deletion removes the account and associated application records handled by FixIt's deletion process. Uploaded files are also requested for removal from managed storage.",
            "Some information may need to be retained where required by law, for security, dispute resolution or legitimate operational records."
          ]} />

          <Section title="Security" items={[
            "FixIt uses authenticated API access and role-based checks for protected application data. No online service can promise absolute security, so please avoid uploading information that is not necessary for a service request."
          ]} />

          <Text style={styles.note}>This in-app notice is a product privacy disclosure, not a substitute for professional legal advice. Before a public commercial launch, the operator should review this policy against the actual production data flows, third-party services and applicable law.</Text>

          <Pressable style={styles.linkRow} onPress={() => router.push("/terms")}>
            <Text style={styles.link}>Read Terms & Conditions</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.brandPrimary} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((x, i) => (
        <View key={i} style={styles.bullet}>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.body}>{x}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.sm
  },
  back: {
    padding: spacing.sm
  },
  title: {
    fontSize: font.xl,
    fontWeight: "700",
    color: colors.onSurface
  },
  card: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border
  },
  updated: {
    fontSize: font.base,
    fontWeight: "600",
    color: colors.onSurface,
    marginBottom: spacing.md
  },
  section: {
    marginTop: spacing.xl
  },
  sectionTitle: {
    fontSize: font.lg,
    fontWeight: "700",
    color: colors.onSurface,
    marginBottom: spacing.sm
  },
  bullet: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm
  },
  dot: {
    fontSize: font.base,
    color: colors.brandPrimary,
    lineHeight: 21
  },
  body: {
    fontSize: font.base,
    color: colors.onSurfaceSecondary,
    lineHeight: 21,
    flex: 1
  },
  note: {
    fontSize: font.sm,
    color: colors.onSurfaceTertiary,
    lineHeight: 19,
    marginTop: spacing.xl
  },
  linkRow: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  link: {
    fontSize: font.base,
    fontWeight: "700",
    color: colors.brandPrimary
  }
});
