import { useColors } from "@/hooks/use-colors";
import { useStorage } from "@/hooks/use-storage";
import { formatTime } from "@/hooks/use-timer";
import { DEFAULT_SETTINGS, GameSettings } from "@/types/game";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface GameHeaderProps {
  elapsedMs: number;
  countdownMs: number | null;
  showTimer: boolean;
  tilesInPool: number;
  tilesInHand: number;
}

export function GameHeader({
  elapsedMs,
  countdownMs,
  showTimer,
  tilesInPool,
  tilesInHand,
}: GameHeaderProps) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const displayTime = countdownMs !== null ? countdownMs : elapsedMs;
  const isLow = countdownMs !== null && countdownMs < 60_000;

  const [settings] = useStorage<GameSettings>("settings", DEFAULT_SETTINGS);

  return (
    <View
      style={{
        paddingTop: insets.top + 8,
        paddingHorizontal: 20,
        paddingBottom: 12,
        flexDirection: settings.handMode === "right" ? "row" : "row-reverse",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: colors.headerBg,
      }}
    >
      <View style={{ flexDirection: "row", gap: 16 }}>
        <View style={{ alignItems: "center" }}>
          <Text
            style={{
              fontSize: 22,
              fontWeight: "700",
              fontVariant: ["tabular-nums"],
              color: colors.textPrimary,
            }}
          >
            {tilesInPool}
          </Text>
          <Text
            style={{
              fontSize: 11,
              color: colors.textSecondary,
              fontWeight: "500",
            }}
          >
            Pool
          </Text>
        </View>
        <View style={{ alignItems: "center" }}>
          <Text
            style={{
              fontSize: 22,
              fontWeight: "700",
              fontVariant: ["tabular-nums"],
              color: colors.textPrimary,
            }}
          >
            {tilesInHand}
          </Text>
          <Text
            style={{
              fontSize: 11,
              color: colors.textSecondary,
              fontWeight: "500",
            }}
          >
            Hand
          </Text>
        </View>
      </View>

      {showTimer && (
        <Text
          style={{
            fontSize: 28,
            fontWeight: "600",
            fontVariant: ["tabular-nums"],
            color: isLow ? "#FF3B30" : colors.textPrimary,
          }}
        >
          {formatTime(displayTime)}
        </Text>
      )}
    </View>
  );
}
