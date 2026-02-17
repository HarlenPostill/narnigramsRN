import { View, Text, PlatformColor } from "react-native";

interface StatsCardProps {
  title: string;
  value: string;
  subtitle?: string;
}

export function StatsCard({ title, value, subtitle }: StatsCardProps) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "white",
        borderRadius: 14,
        borderCurve: "continuous",
        padding: 16,
        gap: 4,
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
        {title}
      </Text>
      <Text
        selectable
        style={{
          fontSize: 28,
          fontWeight: "700",
          color: "#1C1C1E",
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
