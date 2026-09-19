import { AccountGate } from "@/components/auth/account-gate";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
export default function AccountScreen() {
  const { hasAccount, isLoading, player, error } = useAuth();
  const { back, canGoBack, replace } = useRouter();
  const colors = useColors();
  const close = () => {
    if (canGoBack()) back();
    else replace("/");
  };
  if (isLoading) return <ActivityIndicator />;
  if (!hasAccount) return <AccountGate onCancel={close} />;
  return (
    <View style={{ flex: 1, padding: 28, justifyContent: "center", gap: 20 }}>
      <Text
        style={{ color: colors.textPrimary, fontSize: 24, fontWeight: "700" }}
      >
        You’re signed in
      </Text>
      <Text style={{ color: colors.textSecondary }}>
        {player?.displayName ?? "Loading your profile…"}
      </Text>
      {error ? (
        <Text style={{ color: colors.textSecondary }}>{error}</Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={close}
        style={{ minHeight: 48, justifyContent: "center" }}
      >
        <Text style={{ color: "#007AFF", fontSize: 17 }}>Done</Text>
      </Pressable>
    </View>
  );
}
