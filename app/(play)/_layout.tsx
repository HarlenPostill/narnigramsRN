import { Platform } from "react-native";
import { Stack } from "expo-router/stack";

import { PlatformColor } from "@/utils/platform-color";

export default function PlayLayout() {
  return (
    <Stack
      screenOptions={{
        headerTransparent: Platform.OS !== "web",
        headerShown: true,
        headerShadowVisible: false,
        headerLargeTitleShadowVisible: false,
        headerLargeStyle: { backgroundColor: "transparent" },
        headerTitleStyle: {
          color: PlatformColor("label") as unknown as string,
        },
        headerBlurEffect: "none",
        headerBackButtonDisplayMode: "minimal",
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: "Narnigrams", headerLargeTitle: true }}
      />
      <Stack.Screen name="account" options={{ title: "Account" }} />
      <Stack.Screen
        name="rank"
        options={{
          title: "Rating",
          headerLargeTitleEnabled: true,
        }}
      />
      <Stack.Screen
        name="queue"
        options={{
          title: "Finding Match",
          presentation: "fullScreenModal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="game"
        options={{
          title: "Game",
          presentation: "fullScreenModal",
          headerShown: false,
        }}
      />
    </Stack>
  );
}
