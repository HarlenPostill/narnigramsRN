import { defineSecret } from "firebase-functions/params";
import { revokeAppleAuthorization, type AppleConfig } from "./apple";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ONLINE_PROTOCOL } from "../../shared/online";
import { DomainError } from "./domain";
import { GameService } from "./service";
initializeApp();
const dictionary = new Set(
  readFileSync(resolve(__dirname, "../../assets/words.txt"), "utf8")
    .split(/\r?\n/)
    .map((w) => w.trim().toUpperCase())
    .filter(Boolean),
);
const service = new GameService(getFirestore(), dictionary);
const options = { region: "australia-southeast1", maxInstances: 10 };
function uid(
  auth:
    | { uid: string; token: { firebase?: { sign_in_provider?: string } } }
    | undefined,
) {
  if (
    !auth ||
    !["password", "apple.com"].includes(
      auth.token.firebase?.sign_in_provider ?? "",
    )
  )
    throw new HttpsError("unauthenticated", "Open Ranked to sign in.");
  return auth.uid;
}
async function safe<T>(work: () => Promise<T>) {
  try {
    return await work();
  } catch (error) {
    if (error instanceof DomainError)
      throw new HttpsError(error.code, error.message);
    throw error;
  }
}
export const ensurePlayer = onCall(options, (request) =>
  safe(async () => {
    const playerId = uid(request.auth);
    try {
      await getAuth().getUser(playerId);
    } catch {
      throw new HttpsError(
        "unauthenticated",
        "Your account is no longer available.",
      );
    }
    return service.ensurePlayer(playerId);
  }),
);
export const matchmaking = onCall(options, (request) =>
  safe(() =>
    service.matchmaking(
      uid(request.auth),
      request.data?.operation,
      request.data?.protocol,
      request.data?.ruleset,
      request.data?.searchId,
    ),
  ),
);
export const matchCommand = onCall(options, (request) =>
  safe(() => {
    if (request.data?.protocol !== ONLINE_PROTOCOL)
      throw new DomainError(
        "failed-precondition",
        "Protocol mismatch. Update the app.",
      );
    return service.command(uid(request.auth), request.data);
  }),
);
export const deleteAccount = onCall(options, (request) =>
  safe(() => service.deleteAccount(uid(request.auth))),
);
export const cleanup = onSchedule(
  {
    schedule: "every 15 minutes",
    region: "australia-southeast1",
    maxInstances: 1,
  },
  () => service.cleanup(),
);

export const syncStats = onCall(options, (request) =>
  safe(() => service.syncStats(uid(request.auth), request.data?.records)),
);

export const migrateStats = onCall(options, (request) =>
  safe(() =>
    service.migrateStats(
      uid(request.auth),
      request.data?.id,
      request.data?.stats,
    ),
  ),
);

const appleConfig = defineSecret("APPLE_SIGN_IN_CONFIG");
export const revokeApple = onCall(
  { ...options, secrets: [appleConfig] },
  (request) =>
    safe(async () => {
      const playerId = uid(request.auth);
      const code = request.data?.code;
      if (typeof code !== "string" || code.length < 1 || code.length > 4096)
        throw new HttpsError(
          "invalid-argument",
          "Apple authorization code required.",
        );
      const user = await getAuth().getUser(playerId);
      const apple = user.providerData.find(
        (provider) => provider.providerId === "apple.com",
      );
      if (!apple)
        throw new HttpsError(
          "failed-precondition",
          "No Apple account is linked.",
        );
      let config: AppleConfig;
      try {
        config = JSON.parse(appleConfig.value());
        if (
          !config.teamId ||
          !config.keyId ||
          !config.privateKey ||
          !config.clientId
        )
          throw new Error();
      } catch {
        throw new HttpsError(
          "failed-precondition",
          "Apple account deletion is not configured. Contact support.",
        );
      }
      await revokeAppleAuthorization(code, apple.uid, config);
    }),
);
