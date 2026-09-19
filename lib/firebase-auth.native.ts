import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FirebaseAuth from "firebase/auth";
import type { Persistence } from "firebase/auth";
import type { FirebaseApp } from "firebase/app";
// Metro selects @firebase/auth's react-native export. TypeScript selects the
// browser declarations, which omit this native-only export; narrow that gap.
const nativeAuth = FirebaseAuth as typeof FirebaseAuth & {
  getReactNativePersistence(storage: typeof AsyncStorage): Persistence;
};
export function createAuth(app: FirebaseApp) {
  if (typeof nativeAuth.getReactNativePersistence !== "function")
    throw new Error(
      "Firebase native auth requires Metro react-native export resolution.",
    );
  return FirebaseAuth.initializeAuth(app, {
    persistence: nativeAuth.getReactNativePersistence(AsyncStorage),
  });
}
