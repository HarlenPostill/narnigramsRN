import { Theme } from "@/components/theme";
import { AuthProvider } from "@/hooks/use-auth";
import { UsernameModal } from "@/components/auth/username-modal";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

export default function RootLayout() {
  return (
    <Theme>
      <AuthProvider>
        <NativeTabs>
          <NativeTabs.Trigger name="(play)">
            <Icon sf="gamecontroller.fill" />
            <Label>Play</Label>
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="(stats)">
            <Icon sf="chart.bar.fill" />
            <Label>Stats</Label>
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="(settings)">
            <Icon sf="gear" />
            <Label>Settings</Label>
          </NativeTabs.Trigger>
        </NativeTabs>
        <UsernameModal />
        <StatusBar style="auto" />
      </AuthProvider>
    </Theme>
  );
}
