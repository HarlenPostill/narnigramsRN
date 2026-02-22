import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";

export default function TabsLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="(play)">
        <Icon sf="gamecontroller.fill" drawable="ic_menu_gallery" />
        <Label>Play</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(stats)">
        <Icon sf="chart.bar.fill" drawable="ic_menu_sort_by_size" />
        <Label>Stats</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(settings)">
        <Icon sf="gear" drawable="ic_menu_preferences" />
        <Label>Settings</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
