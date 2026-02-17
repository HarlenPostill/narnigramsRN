import { View, Text, PlatformColor } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface StatsCardProps {
  title: string;
  value: string;
  subtitle?: string;
}

export function StatsCard({ title, value, subtitle }: StatsCardProps) {
  const colors = useColors();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.cardBg,
        borderRadius: 14,
        borderCurve: "continuous",
        padding: 16,
        gap: 4,
        boxShadow: colors.cardShadow,
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
        {title}
      </Text>
      <Text
        selectable
        style={{
          fontSize: 28,
          fontWeight: "700",
          color: colors.textPrimary,
          fontVariant: ["tabular-nums"],
        }}
      >
        {value}
      </Text>
      {subtitle && (
        <Text style={{ fontSize: 12, color: PlatformColor("secondaryLabel") }}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}
