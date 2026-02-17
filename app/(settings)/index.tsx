import type { Appearance } from "@/hooks/use-colors";
import { useStorage } from "@/hooks/use-storage";
import type {
  Difficulty,
  GameSettings,
  HandSize,
  PoolSize,
  TimerMode,
} from "@/types/game";
import { DEFAULT_SETTINGS } from "@/types/game";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import { PlatformColor, ScrollView, Switch, Text, View } from "react-native";

const APPEARANCES: Appearance[] = ["system", "light", "dark"];

const POOL_SIZES: PoolSize[] = [50, 80, 100];
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
  const [appearance, setAppearance] = useStorage<Appearance>(
    "appearance",
    "system",
  );

  const update = (partial: Partial<GameSettings>) => {
    setSettings({ ...settings, ...partial });
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 20, gap: 8 }}
    >
      <SettingRow label="Tile Pool Size">
        <SegmentedControl
          values={POOL_SIZES.map(String)}
          selectedIndex={POOL_SIZES.indexOf(settings.poolSize)}
          onChange={({ nativeEvent }) =>
            update({ poolSize: POOL_SIZES[nativeEvent.selectedSegmentIndex] })
          }
        />
      </SettingRow>

      <SettingRow label="Starting Hand Size">
        <SegmentedControl
          values={HAND_SIZES.map(String)}
          selectedIndex={HAND_SIZES.indexOf(settings.handSize)}
          onChange={({ nativeEvent }) =>
            update({ handSize: HAND_SIZES[nativeEvent.selectedSegmentIndex] })
          }
        />
      </SettingRow>

      <SettingRow label="Letter Distribution">
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

      {/* <SettingRow label="Appearance">
        <SegmentedControl
          values={APPEARANCES.map((a) => a.charAt(0).toUpperCase() + a.slice(1))}
          selectedIndex={APPEARANCES.indexOf(appearance)}
          onChange={({ nativeEvent }) =>
            setAppearance(APPEARANCES[nativeEvent.selectedSegmentIndex])
          }
        />
      </SettingRow> */}
    </ScrollView>
  );
}
