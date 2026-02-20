import { useColors } from "@/hooks/use-colors";
import { Stack } from "expo-router/stack";

export default function PlayLayout() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerShown: true,
        headerShadowVisible: false,
        headerLargeTitleShadowVisible: false,
        headerLargeStyle: { backgroundColor: "transparent" },
        headerTitleStyle: {
          color: colors.textPrimary,
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
          headerShown: false,
        }}
      />
    </Stack>
  );
}
