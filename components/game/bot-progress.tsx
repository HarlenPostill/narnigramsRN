import { useColors } from "@/hooks/use-colors";
import type { BotDifficulty, BotState } from "@/types/game";
import { Text, View } from "react-native";

interface BotProgressProps {
  botState: BotState;
  difficulty: BotDifficulty;
}

const DIFFICULTY_LABELS: Record<BotDifficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

const DIFFICULTY_COLORS: Record<BotDifficulty, string> = {
  easy: "#34C759",
  medium: "#FF9500",
  hard: "#FF3B30",
};

export function BotProgress({ botState, difficulty }: BotProgressProps) {
  const colors = useColors();
  const total = botState.tilesPlaced + botState.handSize;
  const progress = total > 0 ? botState.tilesPlaced / total : 0;
  const diffColor = DIFFICULTY_COLORS[difficulty];

  return (
    <View
      style={{
        backgroundColor: colors.cardBg,
        borderRadius: 12,
        borderCurve: "continuous",
        padding: 12,
        gap: 8,
        boxShadow: colors.cardShadow,
        minWidth: 140,
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Text style={{ fontSize: 13, fontWeight: "700", color: colors.textPrimary }}>
          🤖 Bot
        </Text>
        <View
          style={{
            backgroundColor: diffColor + "20",
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 6,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: "600", color: diffColor }}>
            {DIFFICULTY_LABELS[difficulty]}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View
        style={{
          height: 6,
          borderRadius: 3,
          backgroundColor: colors.barEmpty,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            height: "100%",
            width: `${Math.round(progress * 100)}%`,
            backgroundColor: diffColor,
            borderRadius: 3,
          }}
        />
      </View>

      {/* Stats */}
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 11, color: colors.textSecondary }}>
          {botState.tilesPlaced} placed
        </Text>
        <Text style={{ fontSize: 11, color: colors.textSecondary }}>
          {botState.isFinished
            ? "Finished!"
            : `${botState.handSize} in hand`}
        </Text>
      </View>
    </View>
  );
}
