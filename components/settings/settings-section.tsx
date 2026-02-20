import { useColors } from "@/hooks/use-colors";
import { Text, View } from "react-native";

interface SettingsSectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function SettingsSection({
  title,
  description,
  children,
}: SettingsSectionProps) {
  const colors = useColors();

  return (
    <View style={{ gap: 8 }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          textTransform: "uppercase",
          color: colors.textSecondary,
          letterSpacing: 0.5,
          paddingHorizontal: 4,
        }}
      >
        {title}
      </Text>
      <View
        style={{
          backgroundColor: colors.cardBg,
          borderRadius: 14,
          borderCurve: "continuous",
          padding: 16,
          gap: 8,
          boxShadow: colors.cardShadow,
        }}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: colors.textSecondary,
            letterSpacing: 0.5,
            paddingHorizontal: 4,
          }}
        >
          {description}
        </Text>
        {children}
      </View>
    </View>
  );
}
