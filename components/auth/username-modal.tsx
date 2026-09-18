import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { setUsername } from "@/lib/player-service";
import { useState } from "react";
import {
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

export function UsernameModal() {
  const { player, needsUsername, setNeedsUsername, refreshPlayer } = useAuth();
  const colors = useColors();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  if (!needsUsername || !player) return null;

  const handleSave = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      Alert.alert("Too Short", "Username must be at least 2 characters.");
      return;
    }
    if (trimmed.length > 16) {
      Alert.alert("Too Long", "Username must be 16 characters or fewer.");
      return;
    }

    setSaving(true);
    try {
      await setUsername(player.id, trimmed);
      await refreshPlayer();
      setNeedsUsername(false);
    } catch {
      Alert.alert("Error", "Could not save username. Try again.");
    } finally {
      setSaving(false);
    }
  };

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
        zIndex: 1000,
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
          width: 300,
        }}
      >
        <Text
          style={{
            fontSize: 28,
            fontWeight: "800",
            color: colors.textPrimary,
          }}
        >
          Welcome!
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: colors.textSecondary,
            textAlign: "center",
          }}
        >
          Choose a username for ranked play
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Username"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={16}
          style={{
            width: "100%",
            height: 44,
            borderRadius: 10,
            borderCurve: "continuous",
            backgroundColor: colors.screenBg,
            paddingHorizontal: 14,
            fontSize: 17,
            color: colors.textPrimary,
          }}
        />
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={{
            backgroundColor: "#007AFF",
            paddingHorizontal: 32,
            paddingVertical: 14,
            borderRadius: 14,
            borderCurve: "continuous",
            opacity: saving ? 0.6 : 1,
            width: "100%",
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "600", fontSize: 17 }}>
            {saving ? "Saving..." : "Let's Go"}
          </Text>
        </Pressable>
        <Pressable onPress={() => setNeedsUsername(false)}>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
            Skip for now
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}
