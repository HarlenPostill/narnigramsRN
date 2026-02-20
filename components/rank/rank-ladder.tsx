import { useColors } from "@/hooks/use-colors";
import { SymbolView } from "expo-symbols";
import { PlatformColor, Text, View } from "react-native";

const RANK_TIERS = [
  { name: "Bronze", color: "#D2A36A", rating: 300 },
  { name: "Silver", color: "#A6A6A6", rating: 600 },
  { name: "Gold", color: "#FFC800", rating: 900 },
  { name: "Platinum", color: "#7090B5", rating: 1200 },
  { name: "Diamond", color: "#007CFF", rating: 1500 },
] as const;

export function RankLadder() {
  const colors = useColors();

  return (
    <View
      style={{
        flexGrow: 1,
        backgroundColor: colors.cardBg,
        borderRadius: 14,
        borderCurve: "continuous",
        padding: 16,
        gap: 14,
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
        <Text
          style={{
            fontSize: 12,
            fontWeight: "600",
            color: PlatformColor("secondaryLabel"),
            textTransform: "uppercase",
            letterSpacing: 0.3,
          }}
        >
          Rank Ladder
        </Text>
        <SymbolView
          name={"figure.stair.stepper"}
          size={20}
          tintColor={colors.textSecondary}
        />
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          flexGrow: 1,
        }}
      >
        {RANK_TIERS.map((tier) => (
          <View key={tier.name} style={{ gap: 6, alignItems: "center" }}>
            <SymbolView
              name={"trophy.fill"}
              size={16}
              tintColor={tier.color}
            />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: tier.color,
              }}
            >
              {tier.name}
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: tier.color,
              }}
            >
              {tier.rating}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
