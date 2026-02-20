import { Stack } from "expo-router/stack";
import { PlatformColor } from "react-native";

export default function PlayLayout() {
  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
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
      <Stack.Screen
        name="rank"
        options={{
          title: "Rating",
          headerLargeTitleEnabled: true,
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
