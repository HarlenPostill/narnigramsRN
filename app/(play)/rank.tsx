import { StatsCard } from "@/components/stats/stats-card";
import { useColors } from "@/hooks/use-colors";
import { SymbolView } from "expo-symbols";
import { PlatformColor, ScrollView, Text, View } from "react-native";

export default function RankScreen() {
  const colors = useColors();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 20, gap: 12 }}
    >
      <View style={{ gap: 12, flexDirection: "row", alignItems: "center" }}>
        <StatsCard
          title="rating"
          value={"800"}
          icon="medal.star.fill"
          iconColor={colors.textSecondary}
        />
        <StatsCard
          title="Rank"
          value={"GOLD"}
          icon="trophy.fill"
          iconColor={"#FFC800"}
        />
      </View>

      <View style={{ gap: 12, flexDirection: "row", alignItems: "center" }}>
        <StatsCard
          title="Peak Rating"
          value={"996"}
          icon="mountain.2.fill"
          iconColor={colors.textSecondary}
        />
        <StatsCard
          title="Win Rate"
          value={"55%"}
          icon="percent"
          iconColor={colors.textSecondary}
        />
      </View>

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
            {"Rank Ladder"}
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
          <View style={{ gap: 6, alignItems: "center" }}>
            <SymbolView name={"trophy.fill"} size={16} tintColor={"#D2A36A"} />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: "#D2A36A",
              }}
            >
              Bronze
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: "#D2A36A",
              }}
            >
              300
            </Text>
          </View>
          <View style={{ gap: 6, alignItems: "center" }}>
            <SymbolView name={"trophy.fill"} size={16} tintColor={"#A6A6A6"} />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: "#A6A6A6",
              }}
            >
              Silver
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: "#A6A6A6",
              }}
            >
              600
            </Text>
          </View>
          <View style={{ gap: 6, alignItems: "center" }}>
            <SymbolView name={"trophy.fill"} size={16} tintColor={"#FFC800"} />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: "#FFC800",
              }}
            >
              Gold
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: "#FFC800",
              }}
            >
              900
            </Text>
          </View>
          <View style={{ gap: 6, alignItems: "center" }}>
            <SymbolView name={"trophy.fill"} size={16} tintColor={"#7090B5"} />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: "#7090B5",
              }}
            >
              Platinum
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: "#7090B5",
              }}
            >
              1200
            </Text>
          </View>
          <View style={{ gap: 6, alignItems: "center" }}>
            <SymbolView name={"trophy.fill"} size={16} tintColor={"#007CFF"} />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: "#007CFF",
              }}
            >
              Diamond
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: "#007CFF",
              }}
            >
              1500
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
