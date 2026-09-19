import { AccountSettings } from "@/components/settings/account-settings";
import { AccountGate } from "@/components/auth/account-gate";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, Text, ScrollView } from "react-native";
export default function AccountScreen() {
  const { hasAccount, isLoading } = useAuth();
  const { back, canGoBack, replace } = useRouter();
  const colors = useColors();
  const close = () => {
    if (canGoBack()) back();
    else replace("/");
  };
  if (isLoading) return <ActivityIndicator />;
  if (!hasAccount) return <AccountGate onCancel={close} />;
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        padding: 20,
        gap: 20,
        backgroundColor: colors.screenBg,
      }}
    >
      <AccountSettings />
      <Pressable
        accessibilityRole="button"
        onPress={close}
        style={{ minHeight: 48, justifyContent: "center" }}
      >
        <Text style={{ color: "#007AFF", fontSize: 17 }}>Done</Text>
      </Pressable>
    </ScrollView>
  );
}
