import { Theme } from "@/components/theme";
import { useColors } from "@/hooks/use-colors";
import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

export default function RootLayout() {
  const colors = useColors();
  return (
    <Theme>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="game" />
        <Stack.Screen
          name="rank"
          options={{
            headerShown: true,
            title: "Rating",
            headerLargeTitle: true,
            headerTransparent: true,
            headerShadowVisible: false,
            headerLargeTitleShadowVisible: false,
            headerLargeStyle: { backgroundColor: "transparent" },
            headerTitleStyle: { color: colors.textPrimary },
            headerBlurEffect: "none",
            headerBackButtonDisplayMode: "minimal",
          }}
        />
      </Stack>
      <StatusBar style="auto" />
    </Theme>
  );
}
