import { ActionButton } from "@/components/home/action-button";
import { StatsCard } from "@/components/stats/stats-card";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { useStorage } from "@/hooks/use-storage";
import type { GameSettings, GameState, GameStats } from "@/types/game";
import { DEFAULT_SETTINGS, EMPTY_STATS } from "@/types/game";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

const PRESETS = [
  { label: "Short", settings: { poolSize: 50, handSize: 11 } },
  { label: "Medium", settings: { poolSize: 72, handSize: 15 } },
  { label: "Long", settings: { poolSize: 100, handSize: 21 } },
] as const;
const BOT_PRESETS = ["easy", "medium", "hard"] as const;

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
        accessibilityRole="button"
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
  const { push } = useRouter();
  const colors = useColors();
  const { player } = useAuth();
  const [stats] = useStorage<GameStats>("game-stats", EMPTY_STATS);

  const [settings, setSettings] = useStorage<GameSettings>(
    "settings",
    DEFAULT_SETTINGS,
  );
  const [savedGame] = useStorage<GameState | null>("current-game", null);

  const hasSavedGame =
    Boolean(savedGame && savedGame.startedAt > 0 && !savedGame.isComplete);

  const startWithPreset = (preset: Partial<GameSettings>) => {
    setSettings({ ...settings, ...preset });
    push("/game");
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
          onPress={() => push("/rank")}
        >
          <StatsCard
            hasInfo
            title="Rating"
            value={String(player?.rating ?? 800)}
            icon="trophy.fill"
            iconColor="#FFC800"
          />
        </Pressable>
      </View>

      {/* Play Ranked */}
      <ActionButton
        label="Ranked Online"
        rightLabel={player?.displayName ?? "Human matchmaking"}
        iconName="trophy.fill"
        onPress={() => push("/queue")}
        variant="primary"
        delay={0}
      />

      {/* Resume Game */}
      {!!hasSavedGame && savedGame !== null && (
        <ActionButton
          label="Resume Game"
          rightLabel={`${savedGame.pool.length} Tiles Left`}
          iconName="arrowshape.turn.up.forward.fill"
          onPress={() =>
            push({ pathname: "/game", params: { resume: "true" } })
          }
          variant="default"
          delay={100}
          rightLabelColor={colors.textSecondary}
          iconTintColor={colors.textSecondary}
        />
      )}

      {/* Quick Play Presets */}
      <View style={{ gap: 8 }}>
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            textTransform: "uppercase",
            color: colors.textSecondary,
            letterSpacing: 0.5,
            paddingHorizontal: 4,
          }}
        >
          Solo · 50 / 72 / 100 tiles
        </Text>
        <View style={{ gap: 8, flexDirection: "row" }}>
          {PRESETS.map((preset, i) => (
            <PresetCard
              key={preset.label}
              label={preset.label}
              onPress={() => startWithPreset({ ...preset.settings, gameMode: "solo" })}
              delay={200 + i * 80}
              colors={colors}
            />
          ))}
        </View>
      </View>

      {/* Bot Play Presets */}
      <View style={{ gap: 8 }}>
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            textTransform: "uppercase",
            color: colors.textSecondary,
            letterSpacing: 0.5,
            paddingHorizontal: 4,
          }}
        >
          Practice vs AI · no rating changes
        </Text>
        <View style={{ gap: 8, flexDirection: "row" }}>
          {BOT_PRESETS.map((preset, i) => (
            <PresetCard
              key={preset}
              label={preset.charAt(0).toUpperCase() + preset.slice(1)}
              onPress={() => startWithPreset({ gameMode: "bot", botDifficulty: preset, poolSize: 72, handSize: 15 })}
              delay={200 + i * 80}
              colors={colors}
            />
          ))}
        </View>
      </View>
      <Text style={{ color: colors.textSecondary }}>Arrange every tile into connected words. Drag a tile to the bin to exchange it for two. Empty your hand to peel; finish when no shared draw remains. Letter mix and timer are set separately in Settings.</Text>
    </ScrollView>
  );
}
