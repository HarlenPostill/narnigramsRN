import { useCallback } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Tile, CELL_SIZE } from "./tile";
import type { Tile as TileType } from "@/types/game";

interface DraggableTileProps {
  tile: TileType;
  onDragEnd: (tileId: string, absoluteX: number, absoluteY: number) => void;
  size?: number;
}

export function DraggableTile({
  tile,
  onDragEnd,
  size = CELL_SIZE,
}: DraggableTileProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const zIndex = useSharedValue(0);

  const hapticFeedback = useCallback(() => {
    if (process.env.EXPO_OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const handleDragEnd = useCallback(
    (absX: number, absY: number) => {
      onDragEnd(tile.id, absX, absY);
    },
    [tile.id, onDragEnd]
  );

  const snapTiming = { duration: 150, easing: Easing.out(Easing.cubic) };

  const gesture = Gesture.Pan()
    .onStart(() => {
      zIndex.value = 100;
      scale.value = withTiming(1.1, { duration: 120 });
      runOnJS(hapticFeedback)();
    })
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      scale.value = withTiming(1, { duration: 120 });
      runOnJS(handleDragEnd)(e.absoluteX, e.absoluteY);
      translateX.value = withTiming(0, snapTiming);
      translateY.value = withTiming(0, snapTiming);
      zIndex.value = 0;
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    zIndex: zIndex.value,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={animatedStyle}>
        <Tile tile={tile} size={size} />
      </Animated.View>
    </GestureDetector>
  );
}
