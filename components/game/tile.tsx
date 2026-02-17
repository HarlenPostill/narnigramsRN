import type { Tile as TileType } from "@/types/game";
import { Text, View } from "react-native";

const CELL_SIZE = 50;

interface TileProps {
  tile: TileType;
  size?: number;
}

export function Tile({ tile, size = CELL_SIZE }: TileProps) {
  const fontSize = size * 0.55;
  const pointsSize = size * 0.18;

  return (
    <View
      accessibilityLabel={`Letter ${tile.letter}, ${tile.points} points`}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.18,
        borderCurve: "continuous",
        borderColor: "#E7BE93",
        borderWidth: 0.005 * size,
        backgroundColor: "#EBD2B8",
        justifyContent: "center",
        alignItems: "center",
        boxShadow:
          "-0.769px -0.769px 1.538px 0 rgba(0, 0, 0, 0.45) inset, 0.769px 0.769px 1.538px 0 rgba(255, 255, 255, 0.55) inset",
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
