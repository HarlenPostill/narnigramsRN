import { View, Text, PlatformColor } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/use-colors";
import { formatTime } from "@/hooks/use-timer";

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

  return (
    <View
      style={{
        paddingTop: insets.top + 8,
        paddingHorizontal: 20,
        paddingBottom: 12,
        flexDirection: "row",
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
              color: PlatformColor("label"),
            }}
          >
            {tilesInPool}
          </Text>
          <Text
            style={{
              fontSize: 11,
              color: PlatformColor("secondaryLabel"),
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
              color: PlatformColor("label"),
            }}
          >
            {tilesInHand}
          </Text>
          <Text
            style={{
              fontSize: 11,
              color: PlatformColor("secondaryLabel"),
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
            color: isLow ? "#FF3B30" : PlatformColor("label"),
          }}
        >
          {formatTime(displayTime)}
        </Text>
      )}
    </View>
  );
}
