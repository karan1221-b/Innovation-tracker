import { useState } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/AuthContext";
import { AppButton, Input, useToast } from "@/src/ui";
import { colors, spacing, font, radius } from "@/src/theme";

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    if (!email.trim() || !password) {
      toast("Please enter your email and password", "error");
      return;
    }
    setLoading(true);
    try {
      const u = await login(email.trim(), password);
      if (u.role === "customer") router.replace("/(customer)/home");
      else if (u.role === "professional") router.replace("/(pro)/dashboard");
      else router.replace("/(admin)/overview");
    } catch (e: any) {
      toast(e.message || "Login failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.brandPrimary, colors.brandSecondary]} style={[styles.hero, { paddingTop: insets.top + spacing.xl }]}>
        <View style={styles.logoBadge}>
          <Ionicons name="construct" size={30} color={colors.brandPrimary} />
        </View>
        <Text style={styles.brand}>FixIt</Text>
        <Text style={styles.tagline}>Don't search for the service.{"\n"}Just tell us what's wrong.</Text>
      </LinearGradient>

      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        <Input label="Email" testID="login-email-input" value={email} onChangeText={setEmail}
          placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" />
        <Input label="Password" testID="login-password-input" value={password} onChangeText={setPassword}
          placeholder="Your password" secureTextEntry />

        <AppButton title="Sign In" testID="login-submit-button" onPress={onLogin} loading={loading} />

        <Pressable testID="go-register-button" style={styles.footerRow} onPress={() => router.push("/register")}>
          <Text style={styles.footerText}>New to FixIt? </Text>
          <Text style={styles.footerLink}>Create an account</Text>
        </Pressable>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  hero: { paddingBottom: spacing["2xl"], paddingHorizontal: spacing.xl, alignItems: "center", borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  logoBadge: { width: 60, height: 60, borderRadius: 18, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  brand: { fontSize: 34, fontWeight: "700", color: "#fff", letterSpacing: -0.5 },
  tagline: { fontSize: font.base, color: "rgba(255,255,255,0.9)", textAlign: "center", marginTop: spacing.sm, lineHeight: 20 },
  form: { padding: spacing.xl, paddingTop: spacing["2xl"] },
  title: { fontSize: font["2xl"], fontWeight: "700", color: colors.onSurface },
  subtitle: { fontSize: font.base, color: colors.onSurfaceTertiary, marginBottom: spacing.xl, marginTop: spacing.xs },
  footerRow: { flexDirection: "row", justifyContent: "center", marginTop: spacing.xl },
  footerText: { color: colors.onSurfaceTertiary, fontSize: font.base },
  footerLink: { color: colors.brandPrimary, fontSize: font.base, fontWeight: "600" },
});
