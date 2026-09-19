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
function uid(auth: { uid: string } | undefined) {
  if (!auth) throw new HttpsError("unauthenticated", "Open Ranked to sign in.");
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
  { schedule: "every 15 minutes", region: "australia-southeast1", maxInstances: 1 },
  () => service.cleanup(),
);
