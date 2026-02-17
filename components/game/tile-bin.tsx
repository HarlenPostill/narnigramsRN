import { useColors } from "@/hooks/use-colors";
import { Text } from "react-native";
import Animated from "react-native-reanimated";

interface TileBinProps {
  isActive: boolean;
  isHighlighted: boolean;
}

export function TileBin({ isActive, isHighlighted }: TileBinProps) {
  const colors = useColors();

  return (
    <Animated.View
      style={{
        width: 64,
        height: 77,
        borderRadius: 12,
        borderCurve: "continuous",
        backgroundColor: "#0062FF",
        borderTopWidth: 2,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderLeftWidth: 1,
        borderColor: "#6FA6FF",
        justifyContent: "center",
        alignItems: "center",
        gap: 1,
        opacity: isActive ? 1 : 0.4,
        transform: [{ scale: isHighlighted ? 1.15 : 1 }],
      }}
    >
      <Animated.View
        style={{
          width: 52,
          height: 52,
          borderRadius: 8,
          borderCurve: "continuous",
          borderTopWidth: 2,
          borderRightWidth: 1,
          borderLeftWidth: 1,
          borderColor: colors.border,
          backgroundColor: isHighlighted ? "#FF3B30" : colors.cardBg,
        }}
      />
      <Text
        style={{
          fontSize: 10,
          fontWeight: "800",
          color: isHighlighted ? "#FF3B30" : isActive ? "#fff" : "#C7C7CC",
          marginTop: 2,
        }}
      >
        Tile Drop
      </Text>
    </Animated.View>
  );
}

export const BIN_SIZE = 56;
