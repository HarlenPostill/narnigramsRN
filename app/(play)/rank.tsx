import { RankLadder } from "@/components/rank/rank-ladder";
import { StatsCard } from "@/components/stats/stats-card";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { getRank } from "@/utils/elo";
import { useCallback } from "react";
import { ScrollView, View } from "react-native";

export default function RankScreen() {
  const colors = useColors();
  const { player, refreshPlayer } = useAuth();

  const elo = player?.rating ?? 800;
  const peakElo = elo;
  const wins = player?.wins ?? 0;
  const losses = player?.losses ?? 0;
  const totalGames = wins + losses;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
  const rank = getRank(elo);

  const handleRefresh = useCallback(async () => {
    await refreshPlayer();
  }, [refreshPlayer]);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 20, gap: 12 }}
      onScrollEndDrag={handleRefresh}
    >
      <View style={{ gap: 12, flexDirection: "row", alignItems: "center" }}>
        <StatsCard
          title="rating"
          value={String(elo)}
          icon="medal.star.fill"
          iconColor={colors.textSecondary}
        />
        <StatsCard
          title="Rank"
          value={rank.label}
          icon="trophy.fill"
          iconColor={rank.color}
        />
      </View>

      <View style={{ gap: 12, flexDirection: "row", alignItems: "center" }}>
        <StatsCard
          title="Current Rating"
          value={String(peakElo)}
          icon="mountain.2.fill"
          iconColor={colors.textSecondary}
        />
        <StatsCard
          title="Win Rate"
          value={totalGames > 0 ? `${winRate}%` : "--"}
          icon="percent"
          iconColor={colors.textSecondary}
        />
      </View>

      <RankLadder />
    </ScrollView>
  );
}
