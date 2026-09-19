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
  try {
    return FirebaseAuth.initializeAuth(app, {
      persistence: nativeAuth.getReactNativePersistence(AsyncStorage),
    });
  } catch (e) {
    // A re-evaluated module (Fast Refresh, duplicate import) reuses the existing
    // Firebase app, so auth is already initialized. Reuse it instead of failing.
    if (
      e instanceof Error &&
      "code" in e &&
      (e as { code?: string }).code === "auth/already-initialized"
    )
      return FirebaseAuth.getAuth(app);
    throw e;
  }
}
