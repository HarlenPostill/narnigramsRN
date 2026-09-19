import type { Tile as TileType } from "@/types/game";
import { useCallback } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { lightImpact } from "@/utils/haptics";
import { CELL_SIZE, Tile } from "./tile";

interface DraggableTileProps {
  tile: TileType;
  onDragEnd: (tileId: string, absoluteX: number, absoluteY: number) => void;
  size?: number;
  isInvalid?: boolean;
}

export function DraggableTile({
  tile,
  onDragEnd,
  size = CELL_SIZE,
  isInvalid,
}: DraggableTileProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const zIndex = useSharedValue(0);
  const opacity = useSharedValue(1);

  const hapticFeedback = useCallback(() => {
    lightImpact();
  }, []);

  const handleDragEnd = useCallback(
    (absX: number, absY: number) => {
      onDragEnd(tile.id, absX, absY);
    },
    [tile.id, onDragEnd],
  );

  const gesture = Gesture.Pan()
    .onStart(() => {
      zIndex.set(100);
      scale.set(withTiming(1.1, { duration: 120 }));
      runOnJS(hapticFeedback)();
    })
    .onUpdate((e) => {
      translateX.set(e.translationX);
      translateY.set(e.translationY);
    })
    .onEnd((e) => {
      scale.set(withTiming(1, { duration: 120 }));
      // Hide tile immediately so the snap-back is invisible.
      // If the drop is valid the component unmounts before the restore fires.
      // If invalid, the tile fades back in at its original position.
      opacity.set(withSequence(
        withTiming(0, { duration: 0 }),
        withDelay(150, withTiming(1, { duration: 80 })),
      ));
      translateX.set(0);
      translateY.set(0);
      zIndex.set(0);
      runOnJS(handleDragEnd)(e.absoluteX, e.absoluteY);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.get() },
      { translateY: translateY.get() },
      { scale: scale.get() },
    ],
    zIndex: zIndex.get(),
    opacity: opacity.get(),
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={animatedStyle}>
        <Tile tile={tile} size={size} isInvalid={isInvalid} />
      </Animated.View>
    </GestureDetector>
  );
}
