import { Image } from "expo-image";
import { PlatformColor, Text } from "react-native";
import Animated from "react-native-reanimated";

interface TileBinProps {
  isActive: boolean;
  isHighlighted: boolean;
}

export function TileBin({ isActive, isHighlighted }: TileBinProps) {
  return (
    <Animated.View
      style={{
        width: 56,
        height: 56,
        borderRadius: 28,
        borderCurve: "continuous",
        backgroundColor: isHighlighted
          ? "rgba(255, 59, 48, 0.2)"
          : "rgba(142, 142, 147, 0.12)",
        justifyContent: "center",
        alignItems: "center",
        opacity: isActive ? 1 : 0.4,
        transform: [{ scale: isHighlighted ? 1.15 : 1 }],
      }}
    >
      <Image
        source="sf:arrow.2.squarepath"
        style={{ width: 24, height: 24 }}
        tintColor={isHighlighted ? "#FF3B30" : isActive ? "#8E8E93" : "#C7C7CC"}
      />
      <Text
        style={{
          fontSize: 9,
          fontWeight: "600",
          color: isHighlighted
            ? "#FF3B30"
            : isActive
              ? PlatformColor("secondaryLabel")
              : "#C7C7CC",
          marginTop: 2,
        }}
      >
        +2
      </Text>
    </Animated.View>
  );
}

export const BIN_SIZE = 56;
