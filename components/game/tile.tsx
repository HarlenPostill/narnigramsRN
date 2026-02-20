import { useColors } from "@/hooks/use-colors";
import type { Tile as TileType } from "@/types/game";
import { Text, View } from "react-native";

const CELL_SIZE = 50;

interface TileProps {
  tile: TileType;
  size?: number;
  isInvalid?: boolean;
}

export function Tile({ tile, size = CELL_SIZE, isInvalid }: TileProps) {
  const colors = useColors();
  const fontSize = size * 0.6;
  const pointsSize = size * 0.22;

  return (
    <View
      accessibilityLabel={`Letter ${tile.letter}, ${tile.points} points`}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.18,
        borderCurve: "continuous",
        borderColor: isInvalid ? "#E53935" : colors.tileBorder,
        borderWidth: isInvalid ? 2 : 0.005 * size,
        backgroundColor: isInvalid ? "#FFCDD2" : colors.tileBg,
        justifyContent: "center",
        alignItems: "center",
        boxShadow: colors.tileInsetShadow,
      }}
    >
      <Text
        style={{
          fontSize,
          fontWeight: "700",
          color: colors.tileLetter,
          marginTop: -2,
        }}
      >
        {tile.letter}
      </Text>
      <Text
        style={{
          fontSize: pointsSize,
          fontWeight: "600",
          color: colors.tilePoints,
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
