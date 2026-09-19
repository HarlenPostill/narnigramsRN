import { useColors } from "@/hooks/use-colors";
import type { Tile } from "@/types/game";
import { parseKey } from "@/types/game";
import { View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  withSpring,
  type SharedValue,
} from "react-native-reanimated";
import { DraggableTile } from "./draggable-tile";
import { CELL_SIZE } from "./tile";

const GRID_COUNT = 40; // 40x40 grid
const BOARD_SIZE = GRID_COUNT * CELL_SIZE;

interface GameBoardProps {
  board: Record<string, Tile>;
  onTileDragEnd: (tileId: string, absoluteX: number, absoluteY: number) => void;
  scale: SharedValue<number>;
  savedScale: SharedValue<number>;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  savedTranslateX: SharedValue<number>;
  savedTranslateY: SharedValue<number>;
  onContainerLayout?: (y: number, height: number) => void;
  invalidTileIds?: string[];
}

function GridBackground({ lineColor }: { lineColor: string }) {
  const lines: React.ReactNode[] = [];
  for (let i = 0; i <= GRID_COUNT; i++) {
    lines.push(
      <View
        key={`h-${i}`}
        style={{
          position: "absolute",
          top: i * CELL_SIZE,
          left: 0,
          right: 0,
          height: 0.5,
          backgroundColor: lineColor,
        }}
      />,
      <View
        key={`v-${i}`}
        style={{
          position: "absolute",
          left: i * CELL_SIZE,
          top: 0,
          bottom: 0,
          width: 0.5,
          backgroundColor: lineColor,
        }}
      />,
    );
  }
  return <>{lines}</>;
}

export function GameBoard({
  board,
  onTileDragEnd,
  scale,
  savedScale,
  translateX,
  translateY,
  savedTranslateX,
  savedTranslateY,
  onContainerLayout,
  invalidTileIds,
}: GameBoardProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const colors = useColors();

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.set(Math.min(Math.max(savedScale.get() * e.scale, 0.3), 3));
    })
    .onEnd(() => {
      savedScale.set(scale.get());
      if (scale.get() < 0.5) {
        scale.set(withSpring(0.5));
        savedScale.set(0.5);
      } else if (scale.get() > 2.5) {
        scale.set(withSpring(2.5));
        savedScale.set(2.5);
      }
    });

  const pan = Gesture.Pan()
    .minPointers(1)
    .onUpdate((e) => {
      translateX.set(savedTranslateX.get() + e.translationX);
      translateY.set(savedTranslateY.get() + e.translationY);
    })
    .onEnd(() => {
      savedTranslateX.set(translateX.get());
      savedTranslateY.set(translateY.get());
    });

  const composed = Gesture.Simultaneous(pinch, pan);

  const boardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.get() },
      { translateY: translateY.get() },
      { scale: scale.get() },
    ],
  }));

  const boardEntries = Object.entries(board);

  return (
    <View
      style={{ flex: 1, overflow: "hidden" }}
      onLayout={(e) => {
        const { y, height } = e.nativeEvent.layout;
        onContainerLayout?.(y, height);
      }}
    >
        <Animated.View
          style={[
            {
              width: BOARD_SIZE,
              height: BOARD_SIZE,
              position: "absolute",
              top: -(BOARD_SIZE - screenHeight) / 2,
              left: -(BOARD_SIZE - screenWidth) / 2,
            },
            boardStyle,
          ]}
        >
          <GestureDetector gesture={composed}>
            <View style={{ position: "absolute", width: BOARD_SIZE, height: BOARD_SIZE }}><GridBackground lineColor={colors.gridLine} /></View>
          </GestureDetector>
          {boardEntries.map(([key, tile]) => {
            const { row, col } = parseKey(key);
            return (
              <View
                key={`${tile.id}-${key}`}
                style={{
                  position: "absolute",
                  left: col * CELL_SIZE,
                  top: row * CELL_SIZE,
                }}
              >
                <DraggableTile
                  tile={tile}
                  onDragEnd={onTileDragEnd}
                  isInvalid={invalidTileIds?.includes(tile.id)}
                />
              </View>
            );
          })}
        </Animated.View>
    </View>
  );
}

export { BOARD_SIZE, GRID_COUNT };
