import { ScrollView, View, Text, PlatformColor } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Image } from "expo-image";
import { useStorage } from "@/hooks/use-storage";
import { StatsCard } from "@/components/stats/stats-card";
import { StreakChart } from "@/components/stats/streak-chart";
import { formatTime } from "@/hooks/use-timer";
import type { GameStats } from "@/types/game";

const EMPTY_STATS: GameStats = {
  totalGames: 0,
  totalWins: 0,
  currentStreak: 0,
  bestStreak: 0,
  bestTimes: {},
  records: [],
};

export default function StatsScreen() {
  const [stats] = useStorage<GameStats>("game-stats", EMPTY_STATS);

  if (stats.totalGames === 0) {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 40,
          gap: 12,
        }}
      >
        <Image
          source="sf:chart.bar.doc.horizontal"
          style={{ width: 48, height: 48 }}
          tintColor={PlatformColor("tertiaryLabel") as unknown as string}
        />
        <Text
          style={{
            fontSize: 20,
            fontWeight: "600",
            color: PlatformColor("secondaryLabel"),
          }}
        >
          No Games Yet
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: PlatformColor("tertiaryLabel"),
            textAlign: "center",
          }}
        >
          Play your first game to see stats here
        </Text>
      </ScrollView>
    );
  }

  const winRate =
    stats.totalGames > 0
      ? Math.round((stats.totalWins / stats.totalGames) * 100)
      : 0;

  const avgTime =
    stats.records.length > 0
      ? stats.records.reduce((s, r) => s + r.durationMs, 0) / stats.records.length
      : 0;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 20, gap: 16 }}
    >
      <Animated.View
        entering={FadeInDown.duration(400)}
        style={{ flexDirection: "row", gap: 12 }}
      >
        <StatsCard title="Games" value={String(stats.totalGames)} />
        <StatsCard title="Wins" value={String(stats.totalWins)} subtitle={`${winRate}%`} />
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(100).duration(400)}
        style={{ flexDirection: "row", gap: 12 }}
      >
        <StatsCard
          title="Streak"
          value={String(stats.currentStreak)}
          subtitle={`Best: ${stats.bestStreak}`}
        />
        <StatsCard title="Avg Time" value={formatTime(avgTime)} />
      </Animated.View>

      {/* Best Times */}
      {Object.keys(stats.bestTimes).length > 0 && (
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 14,
              borderCurve: "continuous",
              padding: 16,
              gap: 12,
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: PlatformColor("secondaryLabel"),
                textTransform: "uppercase",
                letterSpacing: 0.3,
              }}
            >
              Best Times
            </Text>
            {Object.entries(stats.bestTimes).map(([mode, time]) => (
              <View
                key={mode}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ fontSize: 15, color: PlatformColor("secondaryLabel") }}>
                  {mode.replace("-", " · ")}
                </Text>
                <Text
                  selectable
                  style={{ fontSize: 15, fontWeight: "600", color: "#1C1C1E", fontVariant: ["tabular-nums"] }}
                >
                  {formatTime(time!)}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>
      )}

      {/* Activity Chart */}
      <Animated.View entering={FadeInDown.delay(300).duration(400)}>
        <StreakChart records={stats.records} days={30} />
      </Animated.View>
    </ScrollView>
  );
}
