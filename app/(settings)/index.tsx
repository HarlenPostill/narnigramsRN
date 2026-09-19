import { AccountSettings } from "@/components/settings/account-settings";
import { PrivacySettings } from "@/components/settings/privacy-settings";
import { SettingsSection } from "@/components/settings/settings-section";
import { useStorage } from "@/hooks/use-storage";
import type {
  Difficulty,
  GameSettings,
  HandMode,
  TimerMode,
} from "@/types/game";
import { DEFAULT_SETTINGS } from "@/types/game";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import { ScrollView, Switch, Text, View } from "react-native";
import { PlatformColor } from "@/utils/platform-color";

const HAND_MODE: HandMode[] = ["left", "right"];
const DIFFICULTIES: Difficulty[] = ["easy", "standard", "hard"];
const TIMER_MODES: { label: string; value: TimerMode }[] = [
  { label: "None", value: "none" },
  { label: "5m", value: 5 },
  { label: "10m", value: 10 },
  { label: "15m", value: 15 },
  { label: "30m", value: 30 },
];

function SettingRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 8, paddingVertical: 12 }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          textTransform: "uppercase",
          color: PlatformColor("secondaryLabel"),
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const [settings, setSettings] = useStorage<GameSettings>(
    "settings",
    DEFAULT_SETTINGS,
  );
  const update = (partial: Partial<GameSettings>) => {
    setSettings({ ...settings, ...partial });
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 16, gap: 12 }}
    >
      <AccountSettings />
      <SettingsSection
        title="Game Settings"
        description="Choose Solo length or Practice difficulty on Play. These preferences apply to your next offline game. Ranked uses a standard letter mix and no timer."
      >
        <SettingRow label="Letter Distribution Difficulty">
          <SegmentedControl
            values={DIFFICULTIES.map(
              (d) => d.charAt(0).toUpperCase() + d.slice(1),
            )}
            selectedIndex={DIFFICULTIES.indexOf(settings.difficulty)}
            onChange={({ nativeEvent }) =>
              update({
                difficulty: DIFFICULTIES[nativeEvent.selectedSegmentIndex],
              })
            }
          />
        </SettingRow>
      </SettingsSection>

      <SettingsSection
        title="Timer settings"
        description="Choose the timer for your next Solo or Practice game."
      >
        <SettingRow label="Timer Mode">
          <SegmentedControl
            values={TIMER_MODES.map((t) => t.label)}
            selectedIndex={TIMER_MODES.findIndex(
              (t) => t.value === settings.timerMode,
            )}
            onChange={({ nativeEvent }) =>
              update({
                timerMode: TIMER_MODES[nativeEvent.selectedSegmentIndex].value,
              })
            }
          />
        </SettingRow>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingVertical: 12,
          }}
        >
          <Text
            style={{
              fontSize: 17,
              color: PlatformColor("label"),
            }}
          >
            Show Elapsed Timer
          </Text>
          <Switch
            value={settings.showTimer}
            onValueChange={(v) => update({ showTimer: v })}
          />
        </View>
      </SettingsSection>

      <SettingsSection
        title="Accessibility settings"
        description="These preferences apply to your next offline game."
      >
        <SettingRow label="Hand Mode">
          <SegmentedControl
            values={HAND_MODE.map(
              (d) => d.charAt(0).toUpperCase() + d.slice(1),
            )}
            selectedIndex={HAND_MODE.indexOf(settings.handMode)}
            onChange={({ nativeEvent }) =>
              update({
                handMode: HAND_MODE[nativeEvent.selectedSegmentIndex],
              })
            }
          />
        </SettingRow>
      </SettingsSection>
      <PrivacySettings />
    </ScrollView>
  );
}
