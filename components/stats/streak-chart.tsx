import { View, Text, PlatformColor } from "react-native";
import type { GameRecord } from "@/types/game";

interface StreakChartProps {
  records: GameRecord[];
  days: number;
}

export function StreakChart({ records, days }: StreakChartProps) {
  // Group records by day
  const now = Date.now();
  const dayBuckets: number[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const dayStart = now - (i + 1) * 86400000;
    const dayEnd = now - i * 86400000;
    const count = records.filter((r) => {
      const t = new Date(r.date).getTime();
      return t >= dayStart && t < dayEnd;
    }).length;
    dayBuckets.push(count);
  }

  const maxCount = Math.max(1, ...dayBuckets);

  return (
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
        Games · Last {days} Days
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          gap: 2,
          height: 80,
        }}
      >
        {dayBuckets.map((count, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: Math.max(2, (count / maxCount) * 80),
              backgroundColor: count > 0 ? "#007AFF" : "#E5E5EA",
              borderRadius: 2,
              borderCurve: "continuous",
            }}
          />
        ))}
      </View>
    </View>
  );
}
