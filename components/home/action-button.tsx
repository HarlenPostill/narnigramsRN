import { useColors } from "@/hooks/use-colors";
import { type SymbolViewProps, SymbolView } from "expo-symbols";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

type ActionButtonVariant = "primary" | "outline" | "default";

interface ActionButtonProps {
  label: string;
  rightLabel: string;
  iconName: SymbolViewProps["name"];
  onPress: () => void;
  variant?: ActionButtonVariant;
  delay?: number;
  iconTintColor?: string;
  rightLabelColor?: string;
  disabled?: boolean;
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
  disabled = false,
}: ActionButtonProps) {
  const colors = useColors();

  const isPrimary = variant === "primary";
  const isOutline = variant === "outline";

  const labelColor = isPrimary
    ? "#FFFFFF"
    : isOutline
      ? "#007AFF"
      : colors.textPrimary;

  const resolvedRightLabelColor =
    rightLabelColor ??
    (isPrimary ? "#FFFFFF" : isOutline ? "#007AFF" : undefined);

  const resolvedIconTintColor =
    iconTintColor ?? (isPrimary ? "#FFFFFF" : undefined);

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        onPress={disabled ? undefined : onPress}
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
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
              name={iconName}
              tintColor={resolvedIconTintColor}
            />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
