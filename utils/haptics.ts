import * as Haptics from "expo-haptics";

export function lightImpact() {
  if (process.env.EXPO_OS === "ios") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

export function mediumImpact() {
  if (process.env.EXPO_OS === "ios") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
}

export function successNotification() {
  if (process.env.EXPO_OS === "ios") {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
}
