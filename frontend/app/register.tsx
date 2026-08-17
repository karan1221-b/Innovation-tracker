import { useState } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/AuthContext";
import { AppButton, Input, useToast } from "@/src/ui";
import { colors, spacing, font, radius } from "@/src/theme";

export default function Register() {
  const router = useRouter();
  const { register } = useAuth();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [role, setRole] = useState<"customer" | "professional">("customer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onRegister = async () => {
    if (!name.trim() || !email.trim() || password.length < 6) {
      toast("Fill all fields (password 6+ chars)", "error");
      return;
    }
    setLoading(true);
    try {
      const u = await register({ name: name.trim(), email: email.trim(), phone, password, role });
      if (u.role === "customer") router.replace("/(customer)/home");
      else router.replace("/(pro)/dashboard");
    } catch (e: any) {
      toast(e.message || "Registration failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="register-back-button" onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Create account</Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAwareScrollView bottomOffset={24} contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>I am a</Text>
        <View style={styles.roleRow}>
          {(["customer", "professional"] as const).map((r) => (
            <Pressable
              key={r}
              testID={`role-${r}-button`}
              onPress={() => setRole(r)}
              style={[styles.roleCard, role === r && styles.roleCardActive]}
            >
              <Ionicons name={r === "customer" ? "person" : "briefcase"} size={22} color={role === r ? colors.brandPrimary : colors.muted} />
              <Text style={[styles.roleText, role === r && { color: colors.brandPrimary }]}>
                {r === "customer" ? "Customer" : "Professional"}
              </Text>
            </Pressable>
          ))}
        </View>

        <Input label="Full name" testID="register-name-input" value={name} onChangeText={setName} placeholder="Your name" />
        <Input label="Email" testID="register-email-input" value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" />
        <Input label="Phone (optional)" testID="register-phone-input" value={phone} onChangeText={setPhone} placeholder="+91 98765 43210" keyboardType="phone-pad" />
        <Input label="Password" testID="register-password-input" value={password} onChangeText={setPassword} placeholder="At least 6 characters" secureTextEntry />

        {role === "professional" ? (
          <View style={styles.note}>
            <Ionicons name="information-circle" size={16} color={colors.info} />
            <Text style={styles.noteText}>Your account will be reviewed by our team before you appear to customers.</Text>
          </View>
        ) : null}

        <AppButton title="Create account" testID="register-submit-button" onPress={onRegister} loading={loading} style={{ marginTop: spacing.sm }} />

        <Pressable testID="go-login-button" style={styles.footerRow} onPress={() => router.back()}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Text style={styles.footerLink}>Sign in</Text>
        </Pressable>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  headerTitle: { fontSize: font.lg, fontWeight: "600", color: colors.onSurface },
  form: { padding: spacing.xl, paddingTop: spacing.md },
  label: { fontSize: font.base, fontWeight: "500", color: colors.onSurfaceSecondary, marginBottom: spacing.sm },
  roleRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.xl },
  roleCard: { flex: 1, alignItems: "center", paddingVertical: spacing.lg, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, gap: spacing.sm },
  roleCardActive: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  roleText: { fontSize: font.base, fontWeight: "600", color: colors.onSurfaceTertiary },
  note: { flexDirection: "row", gap: spacing.sm, backgroundColor: "#EFF6FF", padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.lg },
  noteText: { flex: 1, fontSize: font.sm, color: colors.onSurfaceSecondary, lineHeight: 18 },
  footerRow: { flexDirection: "row", justifyContent: "center", marginTop: spacing.xl },
  footerText: { color: colors.onSurfaceTertiary, fontSize: font.base },
  footerLink: { color: colors.brandPrimary, fontSize: font.base, fontWeight: "600" },
});
