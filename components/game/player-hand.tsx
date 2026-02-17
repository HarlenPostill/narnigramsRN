import type { Tile } from "@/types/game";
import { useColors } from "@/hooks/use-colors";
import { View } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";
import { DraggableTile } from "./draggable-tile";

interface PlayerHandProps {
  tiles: Tile[];
  onDragEnd: (tileId: string, absoluteX: number, absoluteY: number) => void;
}

const TILE_GAP = 6;
const HAND_TILE_SIZE = 44;

export function PlayerHand({ tiles, onDragEnd }: PlayerHandProps) {
  const colors = useColors();

  return (
    <View
      style={{
        paddingHorizontal: 12,
        paddingVertical: 20,
        paddingBottom: 0,
        borderRadius: 24,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        borderTopWidth: 0.5,
        borderLeftWidth: 0.5,
        borderRightWidth: 0.5,
        borderTopColor: colors.border,
        borderLeftColor: colors.border,
        borderRightColor: colors.border,
      }}
    >
      <Animated.View
        layout={LinearTransition}
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: TILE_GAP,
          justifyContent: "center",
          minHeight: HAND_TILE_SIZE + 12,
        }}
      >
        {tiles.map((tile) => (
          <Animated.View key={tile.id} layout={LinearTransition}>
            <DraggableTile
              tile={tile}
              onDragEnd={onDragEnd}
              size={HAND_TILE_SIZE}
            />
          </Animated.View>
        ))}
      </Animated.View>
    </View>
  );
}

export { HAND_TILE_SIZE };
