import { ScrollView, View, Text, Pressable, PlatformColor } from "react-native";
import { Link, useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Image } from "expo-image";
import { useStorage } from "@/hooks/use-storage";
import type { GameSettings, GameState } from "@/types/game";
import { DEFAULT_SETTINGS } from "@/types/game";

const PRESETS: { label: string; description: string; settings: Partial<GameSettings> }[] = [
  {
    label: "Quick",
    description: "50 tiles, easy letters",
    settings: { poolSize: 50, handSize: 11, difficulty: "easy", timerMode: "none" },
  },
  {
    label: "Standard",
    description: "80 tiles, standard mix",
    settings: { poolSize: 80, handSize: 15, difficulty: "standard", timerMode: "none" },
  },
  {
    label: "Challenge",
    description: "100 tiles, hard letters, 15min",
    settings: { poolSize: 100, handSize: 21, difficulty: "hard", timerMode: 15 },
  },
];

function PresetCard({
  label,
  description,
  onPress,
  delay,
}: {
  label: string;
  description: string;
  onPress: () => void;
  delay: number;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          backgroundColor: pressed ? "rgba(0,122,255,0.08)" : "white",
          borderRadius: 14,
          borderCurve: "continuous",
          padding: 16,
          gap: 4,
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        })}
      >
        <Text style={{ fontSize: 17, fontWeight: "600", color: "#1C1C1E" }}>
          {label}
        </Text>
        <Text style={{ fontSize: 14, color: PlatformColor("secondaryLabel") }}>
          {description}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const [settings, setSettings] = useStorage<GameSettings>("settings", DEFAULT_SETTINGS);
  const [savedGame] = useStorage<GameState | null>("current-game", null);

  const hasSavedGame = savedGame && savedGame.startedAt > 0 && !savedGame.isComplete;

  const startWithPreset = (preset: Partial<GameSettings>) => {
    setSettings({ ...settings, ...preset });
    router.push("/game");
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 20, gap: 24 }}
    >
      {/* New Game Button */}
      <Animated.View entering={FadeInDown.duration(400)}>
        <Pressable
          onPress={() => router.push("/game")}
          style={({ pressed }) => ({
            backgroundColor: pressed ? "#0066DD" : "#007AFF",
            borderRadius: 16,
            borderCurve: "continuous",
            paddingVertical: 18,
            alignItems: "center",
            boxShadow: "0 4px 12px rgba(0,122,255,0.3)",
          })}
        >
          <Text style={{ color: "white", fontSize: 20, fontWeight: "700" }}>
            New Game
          </Text>
        </Pressable>
      </Animated.View>

      {/* Resume Game */}
      {hasSavedGame && (
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <Pressable
            onPress={() => router.push({ pathname: "/game", params: { resume: "true" } })}
            style={({ pressed }) => ({
              backgroundColor: pressed ? "rgba(52,199,89,0.08)" : "white",
              borderRadius: 14,
              borderCurve: "continuous",
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            })}
          >
            <Image
              source="sf:play.circle.fill"
              style={{ width: 28, height: 28 }}
              tintColor="#34C759"
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: "600", color: "#1C1C1E" }}>
                Resume Game
              </Text>
              <Text style={{ fontSize: 14, color: PlatformColor("secondaryLabel") }}>
                {savedGame.hand.length} tiles in hand · {Object.keys(savedGame.board).length} placed
              </Text>
            </View>
          </Pressable>
        </Animated.View>
      )}

      {/* Quick Play Presets */}
      <View style={{ gap: 8 }}>
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            textTransform: "uppercase",
            color: PlatformColor("secondaryLabel"),
            letterSpacing: 0.5,
            paddingHorizontal: 4,
          }}
        >
          Quick Play
        </Text>
        <View style={{ gap: 8 }}>
          {PRESETS.map((preset, i) => (
            <PresetCard
              key={preset.label}
              label={preset.label}
              description={preset.description}
              onPress={() => startWithPreset(preset.settings)}
              delay={200 + i * 80}
            />
          ))}
        </View>
      </View>

      {/* Current Settings */}
      <View style={{ gap: 8 }}>
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            textTransform: "uppercase",
            color: PlatformColor("secondaryLabel"),
            letterSpacing: 0.5,
            paddingHorizontal: 4,
          }}
        >
          Current Settings
        </Text>
        <View
          style={{
            backgroundColor: "white",
            borderRadius: 14,
            borderCurve: "continuous",
            padding: 16,
            gap: 8,
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          <SettingLine label="Pool Size" value={`${settings.poolSize} tiles`} />
          <SettingLine label="Hand Size" value={`${settings.handSize} tiles`} />
          <SettingLine
            label="Difficulty"
            value={settings.difficulty.charAt(0).toUpperCase() + settings.difficulty.slice(1)}
          />
          <SettingLine
            label="Timer"
            value={settings.timerMode === "none" ? "None" : `${settings.timerMode} min`}
          />
        </View>
      </View>
    </ScrollView>
  );
}

function SettingLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={{ fontSize: 15, color: PlatformColor("secondaryLabel") }}>
        {label}
      </Text>
      <Text selectable style={{ fontSize: 15, fontWeight: "500", color: "#1C1C1E" }}>
        {value}
      </Text>
    </View>
  );
}
