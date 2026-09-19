import { Platform } from "react-native";
import { Stack } from "expo-router/stack";

import { PlatformColor } from "@/utils/platform-color";

export default function StatsLayout() {
  return (
    <Stack
      screenOptions={{
        headerTransparent: Platform.OS !== "web",
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
