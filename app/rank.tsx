import { RankLadder } from "@/components/rank/rank-ladder";
import { StatsCard } from "@/components/stats/stats-card";
import { useColors } from "@/hooks/use-colors";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RankScreen() {
  const colors = useColors();

  return (
    <SafeAreaView style={{ paddingVertical: 60 }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          padding: 20,
          gap: 12,
        }}
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

        <RankLadder />
      </ScrollView>
    </SafeAreaView>
  );
}
