import { Stack } from "expo-router/stack";
import { PlatformColor } from "react-native";

export default function StatsLayout() {
  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerShadowVisible: false,
        headerLargeTitleShadowVisible: false,
        headerLargeStyle: { backgroundColor: "transparent" },
        headerTitleStyle: { color: PlatformColor("label") as unknown as string },
        headerBlurEffect: "none",
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: "Stats", headerLargeTitle: true }}
      />
    </Stack>
  );
}
