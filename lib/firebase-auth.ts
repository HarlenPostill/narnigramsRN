import { getAuth } from "firebase/auth";
import type { FirebaseApp } from "firebase/app";
export function createAuth(app: FirebaseApp) {
  return getAuth(app);
}
