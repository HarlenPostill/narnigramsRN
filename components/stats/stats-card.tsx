import { useColors } from "@/hooks/use-colors";
import { SymbolView } from "expo-symbols";
import { Text, View } from "react-native";

interface StatsCardProps {
  title: string;
  value: string;
  icon?: string;
  iconColor?: string;
  subtitle?: string;
  hasInfo?: boolean;
}

export function StatsCard({
  title,
  value,
  icon,
  iconColor,
  subtitle,
  hasInfo,
}: StatsCardProps) {
  const colors = useColors();

  return (
    <View
      style={{
        flexGrow: 1,
        backgroundColor: colors.cardBg,
        borderRadius: 14,
        borderCurve: "continuous",
        padding: 16,
        gap: 4,
        boxShadow: colors.cardShadow,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: colors.textSecondary,
              textTransform: "uppercase",
              letterSpacing: 0.3,
            }}
          >
            {title}
          </Text>
          {hasInfo && (
            <SymbolView
              name={"info.circle.fill"}
              size={12}
              tintColor={colors.textSecondary}
            />
          )}
        </View>
        {icon && (
          <SymbolView
            name={icon as any}
            size={20}
            tintColor={iconColor || colors.textSecondary}
          />
        )}
      </View>
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
        <Text style={{ fontSize: 12, color: colors.textSecondary }}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}
