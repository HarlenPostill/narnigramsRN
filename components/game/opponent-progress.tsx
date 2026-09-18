import { useColors } from "@/hooks/use-colors";
import type { Player } from "@/types/game";
import { Text, View } from "react-native";

interface OpponentProgressProps {
  opponent: Player;
  connected: boolean;
}

export function OpponentProgress({ opponent, connected }: OpponentProgressProps) {
  const colors = useColors();

  return (
    <View
      style={{
        backgroundColor: colors.cardBg,
        borderRadius: 12,
        borderCurve: "continuous",
        padding: 12,
        gap: 8,
        boxShadow: colors.cardShadow,
        minWidth: 140,
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: connected ? "#34C759" : "#FF3B30",
          }}
        />
        <Text
          style={{
            fontSize: 13,
            fontWeight: "700",
            color: colors.textPrimary,
          }}
          numberOfLines={1}
        >
          {opponent.username}
        </Text>
      </View>

      {/* ELO */}
      <Text style={{ fontSize: 11, color: colors.textSecondary }}>
        ELO {opponent.elo}
      </Text>

      {/* Connection warning */}
      {!connected && (
        <Text style={{ fontSize: 11, color: "#FF3B30", fontWeight: "600" }}>
          Disconnected...
        </Text>
      )}
    </View>
  );
}
