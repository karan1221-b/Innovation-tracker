import { useRef, useState } from "react";
import { StyleSheet, Text, View, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetView, BottomSheetBackdrop, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { useAuth } from "@/src/AuthContext";
import { apiFetch } from "@/src/api";
import { AppButton, useToast } from "@/src/ui";
import { colors, spacing, font, radius, shadow } from "@/src/theme";

export default function Profile() {
  const { user, logout, deleteAccount, setUser } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const editSheet = useRef<BottomSheet>(null);
  const deleteSheet = useRef<BottomSheet>(null);
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const updated = await apiFetch<any>("/auth/me", { method: "PATCH", body: { name, phone } });
      setUser(updated);
      editSheet.current?.close();
      toast("Profile updated", "success");
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const removeAccount = async () => {
    setBusy(true);
    try {
      await deleteAccount();
      toast("Account deleted", "info");
      router.replace("/login");
    } catch (e: any) {
      toast(e.message, "error");
      setBusy(false);
    }
  };

  const MENU = [
    { icon: "notifications-outline", label: "Notifications", onPress: () => router.push("/notifications") },
    { icon: "home-outline", label: "My Home & Appliances", onPress: () => toast("My Home is coming soon", "info") },
    { icon: "card-outline", label: "Payment history", onPress: () => router.push("/(customer)/bookings") },
    { icon: "shield-checkmark-outline", label: "Privacy & data", onPress: () => router.push("/privacy") },
    { icon: "help-circle-outline", label: "Help & support", onPress: () => toast("Support: help@fixit.app", "info") },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: 100 }}
      >
        <View style={styles.head}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.name || "U").charAt(0).toUpperCase()}
            </Text>
          </View>

          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>

          <Pressable
            testID="edit-profile-button"
            style={styles.editBtn}
            onPress={() => editSheet.current?.expand()}
          >
            <Ionicons name="create-outline" size={16} color={colors.brandPrimary} />
            <Text style={styles.editText}>Edit profile</Text>
          </Pressable>
        </View>

        <View style={styles.menu}>
          {MENU.map((m, i) => (
            <Pressable
              key={i}
              testID={`menu-${i}`}
              style={[styles.menuRow, i < MENU.length - 1 && styles.menuBorder]}
              onPress={m.onPress}
            >
              <Ionicons
                name={m.icon as any}
                size={20}
                color={colors.onSurfaceSecondary}
              />
              <Text style={styles.menuLabel}>{m.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          ))}
        </View>

        <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.xl }}>
          <AppButton
            title="Log out"
            testID="logout-button"
            variant="outline"
            icon="log-out-outline"
            onPress={async () => {
              await logout();
              router.replace("/login");
            }}
          />

          <Pressable
            testID="delete-account-button"
            style={styles.deleteRow}
            onPress={() => deleteSheet.current?.expand()}
          >
            <Ionicons name="trash-outline" size={16} color={colors.error} />
            <Text style={styles.deleteText}>Delete my account</Text>
          </Pressable>
        </View>
      </ScrollView>

      <BottomSheet
        ref={editSheet}
        index={-1}
        snapPoints={[380]}
        enablePanDownToClose
        keyboardBehavior="interactive"
        backdropComponent={(p) => (
          <BottomSheetBackdrop
            {...p}
            appearsOnIndex={0}
            disappearsOnIndex={-1}
          />
        )}
      >
        <BottomSheetView style={{ padding: spacing.xl }}>
          <Text style={styles.sheetTitle}>Edit profile</Text>

          <Text style={styles.fieldLabel}>Name</Text>
          <BottomSheetTextInput
            testID="edit-name-input"
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor={colors.muted}
          />

          <Text style={styles.fieldLabel}>Phone</Text>
          <BottomSheetTextInput
            testID="edit-phone-input"
            value={phone}
            onChangeText={setPhone}
            style={styles.input}
            placeholder="+91…"
            keyboardType="phone-pad"
            placeholderTextColor={colors.muted}
          />

          <AppButton
            title="Save"
            testID="save-profile-button"
            onPress={save}
            loading={busy}
            style={{ marginTop: spacing.lg }}
          />
        </BottomSheetView>
      </BottomSheet>

      <BottomSheet
        ref={deleteSheet}
        index={-1}
        snapPoints={[320]}
        enablePanDownToClose
        backdropComponent={(p) => (
          <BottomSheetBackdrop
            {...p}
            appearsOnIndex={0}
            disappearsOnIndex={-1}
          />
        )}
      >
        <BottomSheetView style={{ padding: spacing.xl }}>
          <Text style={styles.sheetTitle}>Delete account?</Text>

          <Text style={styles.deleteWarn}>
            This permanently removes your account, bookings, messages and reviews.
            This cannot be undone.
          </Text>

          <AppButton
            title="Delete permanently"
            testID="confirm-delete-button"
            variant="danger"
            onPress={removeAccount}
            loading={busy}
            style={{ marginTop: spacing.lg }}
          />

          <AppButton
            title="Cancel"
            testID="cancel-delete-button"
            variant="ghost"
            onPress={() => deleteSheet.current?.close()}
          />
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
  },

  head: {
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },

  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontSize: 36,
    fontWeight: "700",
    color: "#fff",
  },

  name: {
    fontSize: font.xl,
    fontWeight: "700",
    color: colors.onSurface,
    marginTop: spacing.md,
  },

  email: {
    fontSize: font.base,
    color: colors.onSurfaceTertiary,
    marginTop: 2,
  },

  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTertiary,
  },

  editText: {
    color: colors.brandPrimary,
    fontWeight: "600",
    fontSize: font.base,
  },

  menu: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },

  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
  },

  menuBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },

  menuLabel: {
    flex: 1,
    fontSize: font.base,
    color: colors.onSurface,
    fontWeight: "500",
  },

  sheetTitle: {
    fontSize: font.xl,
    fontWeight: "700",
    color: colors.onSurface,
    marginBottom: spacing.lg,
  },

  fieldLabel: {
    fontSize: font.base,
    fontWeight: "500",
    color: colors.onSurfaceSecondary,
    marginBottom: spacing.sm,
  },

  input: {
    height: 52,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    fontSize: font.lg,
    color: colors.onSurface,
    marginBottom: spacing.md,
  },

  deleteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
  },

  deleteText: {
    color: colors.error,
    fontWeight: "600",
    fontSize: font.base,
  },

  deleteWarn: {
    fontSize: font.base,
    color: colors.onSurfaceSecondary,
    lineHeight: 21,
    marginTop: spacing.sm,
  },
});
