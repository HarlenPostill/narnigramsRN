import { Theme } from "@/components/theme";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

export default function RootLayout() {
  return (
    <Theme>
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
      <StatusBar style="auto" />
    </Theme>
  );
}
