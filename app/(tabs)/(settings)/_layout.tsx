import { useColors } from "@/hooks/use-colors";
import { Stack } from "expo-router/stack";

export default function SettingsLayout() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerShadowVisible: false,
        headerLargeTitleShadowVisible: false,
        headerLargeStyle: { backgroundColor: "transparent" },
        headerTitleStyle: { color: colors.textPrimary as unknown as string },
        headerBlurEffect: "none",
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: "Settings", headerLargeTitle: true }}
      />
    </Stack>
  );
}
