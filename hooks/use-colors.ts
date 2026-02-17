import { useColorScheme } from "react-native";
import { useStorage } from "./use-storage";

export type Appearance = "system" | "light" | "dark";

const light = {
  // Backgrounds
  screenBg: "#FAFAFA",
  cardBg: "#FFFFFF",
  handBg: "rgba(245, 245, 247, 0.92)",
  headerBg: "rgba(0, 0, 0, 0.03)",
  overlayBg: "rgba(0, 0, 0, 0.5)",
  buttonMutedBg: "rgba(142, 142, 147, 0.12)",

  // Tile
  tileBg: "#EBD2B8",
  tileBorder: "#E7BE93",
  tileLetter: "#3C3226",
  tilePoints: "#8B7D6B",
  tileInsetShadow:
    "-0.769px -0.769px 1.538px 0 rgba(0, 0, 0, 0.45) inset, 0.769px 0.769px 1.538px 0 rgba(255, 255, 255, 0.55) inset",

  // Text
  textPrimary: "#1C1C1E",
  textSecondary: "#8E8E93",

  // Borders
  border: "rgba(0, 0, 0, 0.1)",
  gridLine: "rgba(0, 0, 0, 0.06)",

  // Shadows
  cardShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
  modalShadow: "0 8px 32px rgba(0, 0, 0, 0.15)",
  peelShadow: "0 2px 8px rgba(52, 199, 89, 0.4)",
  ctaShadow: "0 4px 12px rgba(0, 122, 255, 0.3)",

  // Bar chart
  barEmpty: "#E5E5EA",
};

const dark: typeof light = {
  // Backgrounds
  screenBg: "#111111",
  cardBg: "#1C1C1E",
  handBg: "rgba(28, 28, 30, 0.92)",
  headerBg: "rgba(255, 255, 255, 0.04)",
  overlayBg: "rgba(0, 0, 0, 0.65)",
  buttonMutedBg: "rgba(142, 142, 147, 0.2)",

  // Tile
  tileBg: "#CAAD8E",
  tileBorder: "#BCA07C",
  tileLetter: "#3C3226",
  tilePoints: "#8B7D6B",
  tileInsetShadow:
    "-0.769px -0.769px 1.538px 0 rgba(0, 0, 0, 0.6) inset, 0.769px 0.769px 1.538px 0 rgba(255, 255, 255, 0.15) inset",

  // Text
  textPrimary: "#F2F2F7",
  textSecondary: "#98989F",

  // Borders
  border: "rgba(255, 255, 255, 0.1)",
  gridLine: "rgba(255, 255, 255, 0.08)",

  // Shadows
  cardShadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
  modalShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
  peelShadow: "0 2px 8px rgba(48, 209, 88, 0.3)",
  ctaShadow: "0 4px 12px rgba(10, 132, 255, 0.3)",

  // Bar chart
  barEmpty: "#38383A",
};

export function useResolvedScheme(): "light" | "dark" {
  const systemScheme = useColorScheme();
  const [appearance] = useStorage<Appearance>("appearance", "system");

  if (appearance === "system") {
    return systemScheme === "dark" ? "dark" : "light";
  }
  return appearance;
}

export function useColors() {
  const scheme = useResolvedScheme();
  return scheme === "dark" ? dark : light;
}
