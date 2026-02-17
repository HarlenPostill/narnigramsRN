import { View, Text } from "react-native";
import type { Tile as TileType } from "@/types/game";

const CELL_SIZE = 50;

interface TileProps {
  tile: TileType;
  size?: number;
}

export function Tile({ tile, size = CELL_SIZE }: TileProps) {
  const fontSize = size * 0.48;
  const pointsSize = size * 0.22;

  return (
    <View
      accessibilityLabel={`Letter ${tile.letter}, ${tile.points} points`}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.16,
        borderCurve: "continuous",
        backgroundColor: "#F5F0E1",
        justifyContent: "center",
        alignItems: "center",
        boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
      }}
    >
      <Text
        style={{
          fontSize,
          fontWeight: "700",
          color: "#3C3226",
          marginTop: -2,
        }}
      >
        {tile.letter}
      </Text>
      <Text
        style={{
          fontSize: pointsSize,
          fontWeight: "600",
          color: "#8B7D6B",
          position: "absolute",
          bottom: size * 0.06,
          right: size * 0.1,
          fontVariant: ["tabular-nums"],
        }}
      >
        {tile.points}
      </Text>
    </View>
  );
}

export { CELL_SIZE };
