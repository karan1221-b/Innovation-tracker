import { useEffect } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/AuthContext";
import { Loading } from "@/src/ui";
import { colors } from "@/src/theme";

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    } else if (user.role === "customer") {
      router.replace("/(customer)/home");
    } else if (user.role === "professional") {
      router.replace("/(pro)/dashboard");
    } else if (user.role === "admin") {
      router.replace("/(admin)/overview");
    }
  }, [user, loading]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Loading />
    </View>
  );
}
