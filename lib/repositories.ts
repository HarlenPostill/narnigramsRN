import { signInApple, revokeApple } from "./apple-sign-in";
import { getApps, initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  onAuthStateChanged,
  onIdTokenChanged,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  linkWithCredential,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
} from "firebase/firestore";
import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
} from "firebase/functions";
import {
  ONLINE_PROTOCOL,
  ONLINE_RULESET,
  type GameRepositories,
  type MatchCommand,
  type MatchSession,
  type PlayerProfile,
  type PrivatePlayerState,
  type PublicMatch,
  type QueueTicket,
} from "../shared/online";
import { createAuth } from "./firebase-auth";

// Expo replaces only statically spelled EXPO_PUBLIC accesses.
const configuration = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};
const emulatorHost = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST;
export function hasFirebaseConfiguration() {
  return Boolean(
    configuration.apiKey && configuration.projectId && configuration.appId,
  );
}
let repositories: GameRepositories | undefined;
export function getRepositories(): GameRepositories {
  if (repositories) return repositories;
  if (!hasFirebaseConfiguration())
    throw new Error(
      "Ranked is not configured. Set the Firebase values from .env.example, then restart Expo. Solo and Practice work offline.",
    );
  const app = getApps()[0] ?? initializeApp(configuration);
  const auth = createAuth(app);
  const db = getFirestore(app);
  const functions = getFunctions(
    app,
    process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_REGION || "australia-southeast1",
  );
  if (emulatorHost) {
    if (!configuration.projectId?.startsWith("demo-"))
      throw new Error(
        "Emulator builds must use a demo- Firebase project ID to prevent accidental production access.",
      );
    connectAuthEmulator(auth, `http://${emulatorHost}:9099`, {
      disableWarnings: true,
    });
    connectFirestoreEmulator(db, emulatorHost, 8080);
    connectFunctionsEmulator(functions, emulatorHost, 5001);
  }
  const uid = () => {
    if (!auth.currentUser || auth.currentUser.isAnonymous)
      throw new Error("Sign in to play Ranked.");
    return auth.currentUser.uid;
  };
  const call = async <T>(name: string, data: unknown): Promise<T> => {
    await auth.authStateReady();
    uid();
    await auth.currentUser!.getIdToken();
    // Bound connection waits so the UI always offers a way to recover.
    return (
      await httpsCallable<unknown, T>(functions, name, { timeout: 12000 })(data)
    ).data;
  };
  const queue = (operation: "enqueue" | "poll" | "cancel", searchId?: string) =>
    call<QueueTicket>("matchmaking", {
      operation,
      protocol: ONLINE_PROTOCOL,
      ruleset: ONLINE_RULESET,
      ...(searchId ? { searchId } : {}),
    });
  repositories = {
    auth: {
      accountInfo: () => ({
        email: auth.currentUser?.email ?? null,
        providers:
          auth.currentUser?.providerData.map((p) => p.providerId) ?? [],
      }),
      currentUid: () =>
        auth.currentUser && !auth.currentUser.isAnonymous
          ? auth.currentUser.uid
          : null,
      watchAuth: (next) => {
        let previous: string | null | undefined;
        return onIdTokenChanged(auth, (user) => {
          const id = user && !user.isAnonymous ? user.uid : null;
          if (id !== previous) {
            previous = id;
            next(id);
          }
        });
      },
      signIn: async (email, password, create) => {
        await auth.authStateReady();
        if (create && auth.currentUser?.isAnonymous) {
          await linkWithCredential(
            auth.currentUser,
            EmailAuthProvider.credential(email.trim(), password),
          );
        } else if (create)
          await createUserWithEmailAndPassword(auth, email.trim(), password);
        else await signInWithEmailAndPassword(auth, email.trim(), password);
        await auth.currentUser!.getIdToken(true);
      },
      signInApple: async () => {
        await auth.authStateReady();
        await signInApple(auth);
        await auth.currentUser!.getIdToken(true);
      },
      resetPassword: (email) => sendPasswordResetEmail(auth, email.trim()),
      signOut: () => signOut(auth),
      ensurePlayer: async () => {
        await auth.authStateReady();
        uid();
        return call<PlayerProfile>("ensurePlayer", {});
      },
      deleteAccount: async () => {
        await revokeApple(auth, (code) => call("revokeApple", { code }));
        await call("deleteAccount", {});
        await signOut(auth);
      },
    },
    stats: {
      migrate: (id, stats) => call("migrateStats", { id, stats }),
      sync: (records) => call("syncStats", { records }),
      watch: (next, error) =>
        onSnapshot(
          doc(db, "accountStats", uid()),
          { includeMetadataChanges: true },
          (snap) => {
            if (!snap.exists() && snap.metadata.fromCache) return;
            next(
              snap.exists()
                ? (snap.data() as import("../types/game").GameStats)
                : null,
            );
          },
          error,
        ),
    },
    profiles: {
      update: (displayName) =>
        call<PlayerProfile>("updateProfile", { displayName }),
      get: async () => {
        await auth.authStateReady();
        if (!auth.currentUser || auth.currentUser.isAnonymous) return null;
        const snap = await getDoc(doc(db, "players", uid()));
        return snap.exists() ? (snap.data() as PlayerProfile) : null;
      },
      watch: (next, error) =>
        onSnapshot(
          doc(db, "players", uid()),
          { includeMetadataChanges: true },
          (snap) => {
            if (!snap.exists() && snap.metadata.fromCache) return;
            next(snap.exists() ? (snap.data() as PlayerProfile) : null);
          },
          error,
        ),
    },
    matchmaking: {
      enqueue: (searchId) => queue("enqueue", searchId),
      poll: (searchId) => queue("poll", searchId),
      cancel: (searchId) => queue("cancel", searchId),
      watch: (next, error) =>
        onSnapshot(
          doc(db, "queue", uid()),
          (snap) => next(snap.exists() ? (snap.data() as QueueTicket) : null),
          error,
        ),
    },
    matches: {
      watch: (matchId, next, error) => {
        let stopSession: (() => void) | undefined;
        const stopAuth = onAuthStateChanged(
          auth,
          (user) => {
            stopSession?.();
            if (!user || user.isAnonymous) {
              error(new Error("Open Ranked to reconnect to your player."));
              return;
            }
            let match: PublicMatch | undefined;
            let player: PrivatePlayerState | undefined;
            const emit = () => {
              if (match && player && match.sequence === player.sequence)
                next({ match, player });
            };
            const a = onSnapshot(
              doc(db, "matches", matchId),
              (snap) => {
                if (!snap.exists())
                  return error(new Error("Match no longer exists."));
                match = snap.data() as PublicMatch;
                if (match.protocol !== ONLINE_PROTOCOL)
                  return error(
                    new Error("Update the app to reconnect to this match."),
                  );
                emit();
              },
              error,
            );
            const b = onSnapshot(
              doc(db, "privatePlayers", `${matchId}_${user.uid}`),
              (snap) => {
                if (snap.exists()) {
                  player = snap.data() as PrivatePlayerState;
                  emit();
                }
              },
              error,
            );
            stopSession = () => {
              a();
              b();
            };
          },
          error,
        );
        return () => {
          stopAuth();
          stopSession?.();
        };
      },
      command: (command) =>
        call<MatchSession>("matchCommand", {
          ...command,
          protocol: ONLINE_PROTOCOL,
        }),
    },
  };
  return repositories;
}
export function commandId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}
export type { MatchCommand };
