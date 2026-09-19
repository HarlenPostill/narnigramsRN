import { useColors } from "@/hooks/use-colors";
import { SymbolView } from "expo-symbols";
import { Text, View } from "react-native";
import { PlatformColor } from "@/utils/platform-color";

import { RANKS } from "@/utils/elo";

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
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        {RANKS.map((tier) => (
          <View key={tier.label} style={{ gap: 6, alignItems: "center" }}>
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
              {tier.label}
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: tier.color,
              }}
            >
              {tier.min}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
