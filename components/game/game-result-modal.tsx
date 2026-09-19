import { useColors } from "@/hooks/use-colors";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

interface GameResultModalProps {
  emoji: string;
  title: string;
  subtitle: string;
  eloDelta?: number;
  onDismiss: () => void;
}

export function GameResultModal({
  emoji,
  title,
  subtitle,
  eloDelta,
  onDismiss,
}: GameResultModalProps) {
  const colors = useColors();

  return (
    <Animated.View
      entering={FadeIn}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.overlayBg,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <View
        style={{
          backgroundColor: colors.cardBg,
          borderRadius: 20,
          borderCurve: "continuous",
          padding: 32,
          alignItems: "center",
          gap: 16,
          marginHorizontal: 40,
          boxShadow: colors.modalShadow,
        }}
      >
        <Text style={{ fontSize: 48 }}>{emoji}</Text>
        <Text
          style={{
            fontSize: 28,
            fontWeight: "800",
            color: colors.textPrimary,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontSize: 17,
            color: colors.textSecondary,
            textAlign: "center",
          }}
        >
          {subtitle}
        </Text>
        {eloDelta !== undefined && (
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: eloDelta >= 0 ? "#34C759" : "#FF3B30",
            }}
          >
            {eloDelta >= 0 ? `+${eloDelta}` : `${eloDelta}`} ELO
          </Text>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={onDismiss}
          style={{
            backgroundColor: "#007AFF",
            paddingHorizontal: 32,
            paddingVertical: 14,
            borderRadius: 14,
            borderCurve: "continuous",
            marginTop: 8,
          }}
        >
          <Text style={{ color: "white", fontWeight: "600", fontSize: 17 }}>
            Done
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}
