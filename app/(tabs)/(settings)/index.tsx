import { SettingsSection } from "@/components/settings/settings-section";
import { useColors } from "@/hooks/use-colors";
import { useStorage } from "@/hooks/use-storage";
import type {
  Difficulty,
  GameMode,
  GameSettings,
  HandMode,
  HandSize,
  PoolSize,
  TimerMode,
} from "@/types/game";
import { DEFAULT_SETTINGS } from "@/types/game";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import { ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const HAND_MODE: HandMode[] = ["left", "right"];
const POOL_SIZES: PoolSize[] = [50, 72, 100];
const GAME_MODE: GameMode[] = ["solo", "bot"];
const HAND_SIZES: HandSize[] = [11, 15, 21];
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
  const colors = useColors();
  return (
    <View style={{ gap: 8, paddingVertical: 12 }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          textTransform: "uppercase",
          color: colors.textSecondary,
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

  const colors = useColors();

  return (
    <SafeAreaView style={{ paddingVertical: 60 }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16, gap: 12 }}
      >
        <SettingsSection
          title="Game Settings"
          description="Edit settings for your next game. This will not affect any games currently in progress."
        >
          <SettingRow label="Next Game Mode">
            <SegmentedControl
              values={GAME_MODE.map(
                (d) => d.charAt(0).toUpperCase() + d.slice(1),
              )}
              selectedIndex={GAME_MODE.indexOf(settings.gameMode)}
              onChange={({ nativeEvent }) =>
                update({
                  gameMode: GAME_MODE[nativeEvent.selectedSegmentIndex],
                })
              }
            />
          </SettingRow>

          <SettingRow label="Tile Pool Size (Game Length)">
            <SegmentedControl
              values={POOL_SIZES.map(String)}
              selectedIndex={POOL_SIZES.indexOf(settings.poolSize)}
              onChange={({ nativeEvent }) =>
                update({
                  poolSize: POOL_SIZES[nativeEvent.selectedSegmentIndex],
                })
              }
            />
          </SettingRow>

          <SettingRow label="Starting Tile Size">
            <SegmentedControl
              values={HAND_SIZES.map(String)}
              selectedIndex={HAND_SIZES.indexOf(settings.handSize)}
              onChange={({ nativeEvent }) =>
                update({
                  handSize: HAND_SIZES[nativeEvent.selectedSegmentIndex],
                })
              }
            />
          </SettingRow>

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
          description="Timer settings will affect any ongoing game and future games."
        >
          <SettingRow label="Timer Mode">
            <SegmentedControl
              values={TIMER_MODES.map((t) => t.label)}
              selectedIndex={TIMER_MODES.findIndex(
                (t) => t.value === settings.timerMode,
              )}
              onChange={({ nativeEvent }) =>
                update({
                  timerMode:
                    TIMER_MODES[nativeEvent.selectedSegmentIndex].value,
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
                color: colors.textPrimary,
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
          description="Accessibility settings will affect any ongoing game and future games."
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
      </ScrollView>
    </SafeAreaView>
  );
}
