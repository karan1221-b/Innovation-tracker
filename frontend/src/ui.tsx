import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, radius, spacing, font, shadow } from "@/src/theme";

// ---------------- Button ----------------
export function AppButton({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
  icon,
  style,
  testID,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  style?: ViewStyle;
  testID?: string;
}) {
  const bg = {
    primary: colors.brandPrimary,
    secondary: colors.surfaceSecondary,
    outline: "transparent",
    danger: colors.error,
    ghost: "transparent",
  }[variant];
  const fg = {
    primary: colors.onBrandPrimary,
    secondary: colors.onSurface,
    outline: colors.brandPrimary,
    danger: colors.onError,
    ghost: colors.brandPrimary,
  }[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      testID={testID}
      disabled={isDisabled}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1 },
        variant === "outline" && { borderWidth: 1.5, borderColor: colors.brandPrimary },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.btnRow}>
          {icon ? <Ionicons name={icon as any} size={18} color={fg} style={{ marginRight: 8 }} /> : null}
          <Text style={[styles.btnText, { color: fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

// ---------------- Card ----------------
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// ---------------- Input ----------------
export function Input({
  label,
  error,
  style,
  ...props
}: TextInputProps & { label?: string; error?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: spacing.lg }}>
      {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.muted}
        style={[
          styles.input,
          focused && { borderColor: colors.brandPrimary },
          error && { borderColor: colors.error },
          style,
        ]}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
      {error ? <Text style={styles.inputError}>{error}</Text> : null}
    </View>
  );
}

// ---------------- Badges ----------------
export function VerifiedBadge({ status }: { status?: string }) {
  if (status !== "verified") return null;
  return (
    <View style={styles.verified}>
      <Ionicons name="shield-checkmark" size={12} color={colors.brandPrimary} />
      <Text style={styles.verifiedText}>Verified</Text>
    </View>
  );
}

export function Tag({ label, color = colors.brandTertiary, textColor = colors.onBrandTertiary }: { label: string; color?: string; textColor?: string }) {
  return (
    <View style={[styles.tag, { backgroundColor: color }]}>
      <Text style={[styles.tagText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

// ---------------- States ----------------
export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.brandPrimary} />
      {label ? <Text style={styles.stateSub}>{label}</Text> : null}
    </View>
  );
}

export function EmptyState({ icon = "cube-outline", title, subtitle, action }: { icon?: string; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <View style={styles.center}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon as any} size={40} color={colors.brandPrimary} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      {subtitle ? <Text style={styles.stateSub}>{subtitle}</Text> : null}
      {action ? <View style={{ marginTop: spacing.lg }}>{action}</View> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <Ionicons name="alert-circle-outline" size={44} color={colors.error} />
      <Text style={styles.stateTitle}>Something went wrong</Text>
      <Text style={styles.stateSub}>{message || "Please try again."}</Text>
      {onRetry ? <AppButton title="Retry" variant="outline" onPress={onRetry} style={{ marginTop: spacing.lg }} /> : null}
    </View>
  );
}

// ---------------- Toast ----------------
type ToastType = "success" | "error" | "info";
const ToastContext = createContext<(msg: string, type?: ToastType) => void>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState("");
  const [type, setType] = useState<ToastType>("info");
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<any>(null);

  const show = useCallback((m: string, t: ToastType = "info") => {
    setMsg(m);
    setType(t);
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start();
    }, 2800);
  }, [opacity]);

  const bg = { success: colors.success, error: colors.error, info: colors.surfaceInverse }[type];
  const iconName = { success: "checkmark-circle", error: "close-circle", info: "information-circle" }[type];

  return (
    <ToastContext.Provider value={show}>
      {children}
      <Animated.View pointerEvents="none" style={[styles.toastWrap, { opacity }]}>
        <View style={[styles.toast, { backgroundColor: bg }]}>
          <Ionicons name={iconName as any} size={18} color="#fff" />
          <Text style={styles.toastText} numberOfLines={2}>{msg}</Text>
        </View>
      </Animated.View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  btnRow: { flexDirection: "row", alignItems: "center" },
  btnText: { fontSize: font.lg, fontWeight: "600" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  inputLabel: { fontSize: font.base, fontWeight: "500", color: colors.onSurfaceSecondary, marginBottom: spacing.sm },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    fontSize: font.lg,
    color: colors.onSurface,
    backgroundColor: colors.surface,
  },
  inputError: { color: colors.error, fontSize: font.sm, marginTop: spacing.xs },
  verified: { flexDirection: "row", alignItems: "center", backgroundColor: colors.brandTertiary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, gap: 3 },
  verifiedText: { fontSize: 11, color: colors.brandPrimary, fontWeight: "600" },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  tagText: { fontSize: 12, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  emptyIcon: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center", marginBottom: spacing.lg },
  stateTitle: { fontSize: font.xl, fontWeight: "600", color: colors.onSurface, marginTop: spacing.sm, textAlign: "center" },
  stateSub: { fontSize: font.base, color: colors.onSurfaceTertiary, marginTop: spacing.sm, textAlign: "center" },
  toastWrap: { position: "absolute", top: 60, left: 0, right: 0, alignItems: "center", zIndex: 9999 },
  toast: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md, maxWidth: "90%", ...shadow.raised },
  toastText: { color: "#fff", fontSize: font.base, fontWeight: "500", flexShrink: 1 },
});
