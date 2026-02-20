import { ActionButton } from "@/components/home/action-button";
import { StatsCard } from "@/components/stats/stats-card";
import { useColors } from "@/hooks/use-colors";
import { useStorage } from "@/hooks/use-storage";
import type { GameSettings, GameState, GameStats } from "@/types/game";
import { DEFAULT_SETTINGS, EMPTY_STATS } from "@/types/game";
import { useRouter } from "expo-router";
import { PlatformColor, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

const PRESETS: {
  label: string;
  description: string;
  settings: Partial<GameSettings>;
}[] = [
  {
    label: "Quick",
    description: "50 tiles, easy letters",
    settings: {
      poolSize: 50,
      handSize: 11,
      difficulty: "easy",
      timerMode: "none",
    },
  },
  {
    label: "Standard",
    description: "72 tiles, standard mix",
    settings: {
      poolSize: 72,
      handSize: 15,
      difficulty: "standard",
      timerMode: "none",
    },
  },
  {
    label: "Challenge",
    description: "100 tiles, hard letters, 15min",
    settings: {
      poolSize: 100,
      handSize: 21,
      difficulty: "hard",
      timerMode: 15,
    },
  },
];

function PresetCard({
  label,
  onPress,
  delay,
  colors,
}: {
  label: string;
  onPress: () => void;
  delay: number;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(400)}
      style={{ flexGrow: 1, width: "0%" }}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          backgroundColor: pressed ? "#0066DD20" : colors.cardBg,
          borderRadius: 14,
          alignItems: "center",
          flexGrow: 1,
          borderCurve: "continuous",
          padding: 16,
          gap: 4,
          boxShadow: colors.cardShadow,
        })}
      >
        <Text
          style={{ fontSize: 13, fontWeight: "700", color: colors.textPrimary }}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const [stats] = useStorage<GameStats>("game-stats", EMPTY_STATS);

  const [settings, setSettings] = useStorage<GameSettings>(
    "settings",
    DEFAULT_SETTINGS,
  );
  const [savedGame] = useStorage<GameState | null>("current-game", null);

  const hasSavedGame =
    savedGame && savedGame.startedAt > 0 && !savedGame.isComplete;

  const startWithPreset = (preset: Partial<GameSettings>) => {
    setSettings({ ...settings, ...preset });
    router.push("/game");
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 20, gap: 24 }}
    >
      <View style={{ gap: 12, flexDirection: "row", alignItems: "center" }}>
        <StatsCard
          title="streak"
          value={String(stats.currentStreak)}
          icon="flame.fill"
          iconColor="#E96812"
        />
        <Pressable
          style={{ flexGrow: 1 }}
          onPress={() => router.push("/(play)/rank")}
        >
          <StatsCard
            hasInfo
            title="Rating"
            value={"800"}
            icon="trophy.fill"
            iconColor="#FFC800"
          />
        </Pressable>
      </View>

      {/* Play Ranked */}
      <ActionButton
        label="Play Ranked"
        rightLabel="GOLD"
        iconName="trophy.fill"
        onPress={() => router.push("/game")}
        variant="primary"
        delay={0}
      />

      {/* Play Solo */}
      <ActionButton
        label="Play Solo"
        rightLabel="Quick"
        iconName="person.fill"
        onPress={() => router.push("/game")}
        variant="outline"
        delay={50}
      />

      {/* Resume Game */}
      {hasSavedGame && (
        <ActionButton
          label="Resume Game"
          rightLabel={`${savedGame.pool.length} Tiles Left`}
          iconName="arrowshape.turn.up.forward.fill"
          onPress={() =>
            router.push({ pathname: "/game", params: { resume: "true" } })
          }
          variant="default"
          delay={100}
          rightLabelColor={PlatformColor("secondaryLabel") as unknown as string}
          iconTintColor={PlatformColor("secondaryLabel") as unknown as string}
        />
      )}

      {/* Quick Play Presets */}
      <View style={{ gap: 8 }}>
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            textTransform: "uppercase",
            color: PlatformColor("secondaryLabel"),
            letterSpacing: 0.5,
            paddingHorizontal: 4,
          }}
        >
          Quick solo games
        </Text>
        <View style={{ gap: 8, flexDirection: "row" }}>
          {PRESETS.map((preset, i) => (
            <PresetCard
              key={preset.label}
              label={preset.label}
              onPress={() => startWithPreset(preset.settings)}
              delay={200 + i * 80}
              colors={colors}
            />
          ))}
        </View>
      </View>

      {/* CPU Play Presets */}
      <View style={{ gap: 8 }}>
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            textTransform: "uppercase",
            color: PlatformColor("secondaryLabel"),
            letterSpacing: 0.5,
            paddingHorizontal: 4,
          }}
        >
          Warm up with bots
        </Text>
        <View style={{ gap: 8, flexDirection: "row" }}>
          {PRESETS.map((preset, i) => (
            <PresetCard
              key={preset.label}
              label={preset.label}
              onPress={() => startWithPreset(preset.settings)}
              delay={200 + i * 80}
              colors={colors}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
