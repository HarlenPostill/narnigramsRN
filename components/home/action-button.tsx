import { useColors } from "@/hooks/use-colors";
import { SymbolView } from "expo-symbols";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

type ActionButtonVariant = "primary" | "outline" | "default";

interface ActionButtonProps {
  label: string;
  rightLabel: string;
  iconName: string;
  onPress: () => void;
  variant?: ActionButtonVariant;
  delay?: number;
  iconTintColor?: string;
  rightLabelColor?: string;
}

export function ActionButton({
  label,
  rightLabel,
  iconName,
  onPress,
  variant = "default",
  delay = 0,
  iconTintColor,
  rightLabelColor,
}: ActionButtonProps) {
  const colors = useColors();

  const isPrimary = variant === "primary";
  const isOutline = variant === "outline";

  const labelColor = isPrimary
    ? colors.cardBg
    : isOutline
      ? "#007AFF"
      : colors.textPrimary;

  const resolvedRightLabelColor =
    rightLabelColor ?? (isPrimary ? colors.cardBg : isOutline ? "#007AFF" : undefined);

  const resolvedIconTintColor =
    iconTintColor ?? (isPrimary ? colors.cardBg : undefined);

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          backgroundColor: isPrimary
            ? pressed
              ? "#0066DD"
              : "#007AFF"
            : pressed
              ? "#0066DD20"
              : colors.cardBg,
          borderRadius: 14,
          borderCurve: "continuous",
          padding: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          ...(isOutline
            ? {
                borderColor: pressed ? "#0066DD" : "#007AFF",
                borderWidth: 2,
              }
            : {}),
          boxShadow: isPrimary ? colors.ctaShadow : colors.cardShadow,
        })}
      >
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: labelColor,
            }}
          >
            {label}
          </Text>
          <View
            style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                textTransform: "uppercase",
                color: resolvedRightLabelColor,
              }}
            >
              {rightLabel}
            </Text>
            <SymbolView
              size={16}
              name={iconName as any}
              tintColor={resolvedIconTintColor}
            />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
