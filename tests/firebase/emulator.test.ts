import {
  initializeApp as initializeClient,
  deleteApp as deleteClient,
} from "firebase/app";
import {
  getAuth as getClientAuth,
  connectAuthEmulator,
  signInAnonymously,
  linkWithCredential,
  EmailAuthProvider,
  signOut,
  signInWithEmailAndPassword,
  onIdTokenChanged,
} from "firebase/auth";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test, { after, before } from "node:test";
import { GameService } from "../../functions/src/service";
import {
  deleteApp,
  getAuth,
  getFirestore,
  initializeApp,
} from "../../functions/test-support";
import { ONLINE_PROTOCOL, ONLINE_RULESET } from "../../shared/online";
const enabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
let environment: RulesTestEnvironment;
const admin = enabled
  ? initializeApp({ projectId: "demo-narnigrams" })
  : undefined;
let now = 1_000_000;
const db = admin ? getFirestore(admin) : undefined;
const service = db
  ? new GameService(db, new Set(["CAT", "AT"]), () => now)
  : undefined;
before(async () => {
  if (enabled)
    environment = await initializeTestEnvironment({
      projectId: "demo-narnigrams",
      firestore: { rules: readFileSync("firestore.rules", "utf8") },
    });
});
after(async () => {
  if (environment) await environment.cleanup();
  if (admin) await deleteApp(admin);
});
test(
  "emulator security and transactional backend",
  { skip: !enabled },
  async (t) => {
    await t.test(
      "display names are non-unique, validated and preserve ranked data",
      async () => {
        await assert.rejects(() =>
          service!.updateProfile("missing-player", "New name"),
        );
        assert.equal(
          (await db!.doc("players/missing-player").get()).exists,
          false,
        );
        const original = await service!.ensurePlayer("name-alice");
        await service!.ensurePlayer("name-bob");
        const updated = await service!.updateProfile(
          "name-alice",
          "  Friendly   Koala  ",
        );
        assert.deepEqual(updated, {
          ...original,
          displayName: "Friendly Koala",
        });
        const other = await service!.updateProfile(
          "name-bob",
          "Friendly Koala",
        );
        assert.equal(other.displayName, updated.displayName);
        for (const value of [
          "",
          " ",
          "x".repeat(31),
          "bad\nname",
          "bad\u202ename",
          { rating: 9999 },
        ])
          await assert.rejects(() =>
            service!.updateProfile("name-alice", value),
          );
        assert.equal(
          (await db!.doc("players/name-alice").get()).get("rating"),
          original.rating,
        );
      },
    );
    await t.test(
      "rules deny all client writes and unrelated reads; permit owner snapshots",
      async () => {
        await environment.clearFirestore();
        await environment.withSecurityRulesDisabled(async (context) => {
          const firestore = context.firestore();
          await setDoc(doc(firestore, "players", "alice"), {
            uid: "alice",
            rating: 800,
          });
          await setDoc(doc(firestore, "queue", "alice"), { uid: "alice" });
          await setDoc(doc(firestore, "matches", "one"), {
            playerIds: ["alice", "bob"],
          });
          await setDoc(doc(firestore, "privatePlayers", "one_alice"), {
            uid: "alice",
            hand: [],
          });
          await setDoc(doc(firestore, "serverMatches", "one"), {
            secret: "pool",
          });
        });
        const alice = environment
          .authenticatedContext("alice", {
            firebase: { sign_in_provider: "password" },
          })
          .firestore();
        const mallory = environment
          .authenticatedContext("mallory", {
            firebase: { sign_in_provider: "password" },
          })
          .firestore();
        const guest = environment.unauthenticatedContext().firestore();
        const anonymous = environment
          .authenticatedContext("alice", {
            firebase: { sign_in_provider: "anonymous" },
          })
          .firestore();
        await assertFails(getDoc(doc(anonymous, "players", "alice")));
        await assertSucceeds(getDoc(doc(alice, "players", "alice")));
        await assertSucceeds(getDoc(doc(alice, "queue", "alice")));
        await assertSucceeds(getDoc(doc(alice, "matches", "one")));
        await assertSucceeds(getDoc(doc(alice, "privatePlayers", "one_alice")));
        for (const path of [
          "players/alice",
          "queue/alice",
          "matches/one",
          "privatePlayers/one_alice",
          "serverMatches/one",
        ]) {
          await assertFails(getDoc(doc(mallory, path)));
          await assertFails(getDoc(doc(guest, path)));
          await assertFails(
            setDoc(doc(alice, path), { rating: 9999, status: "completed" }),
          );
        }
        await assertFails(getDocs(collection(alice, "players")));
        await assertFails(getDocs(collection(alice, "matches")));
      },
    );
    await t.test(
      "concurrent claimers produce one opponent and durable reconnect; settlement is immutable",
      async () => {
        await environment.clearFirestore();
        now = 1_000_000;
        await Promise.all(
          ["a", "b", "c"].map((id) => service!.ensurePlayer(id)),
        );
        await service!.matchmaking(
          "a",
          "enqueue",
          ONLINE_PROTOCOL,
          ONLINE_RULESET,
        );
        const [b, c] = await Promise.all(
          ["b", "c"].map((id) =>
            service!.matchmaking(
              id,
              "enqueue",
              ONLINE_PROTOCOL,
              ONLINE_RULESET,
            ),
          ),
        );
        const matched = [b, c].filter((t) => t.status === "matched");
        assert.equal(matched.length, 1);
        const opponent = matched[0].uid;
        const matchId = matched[0].matchId!;
        assert.equal(
          (
            await service!.matchmaking(
              "a",
              "enqueue",
              ONLINE_PROTOCOL,
              ONLINE_RULESET,
            )
          ).matchId,
          matchId,
        );
        const action = {
          matchId,
          commandId: "forfeit-action",
          expectedSequence: 0,
          type: "forfeit" as const,
        };
        const [one, two] = await Promise.all([
          service!.command("a", action),
          service!.command("a", action),
        ]);
        assert.deepEqual(one.match.result, two.match.result);
        assert.equal(one.match.result?.winnerId, opponent);
        const a = await db!.doc("players/a").get();
        const other = await db!.doc(`players/${opponent}`).get();
        assert.equal(a.get("games"), 1);
        assert.equal(a.get("losses"), 1);
        assert.equal(a.get("rating"), 780);
        assert.equal(other.get("rating"), 820);
      },
    );
    await t.test(
      "fallback/cancel/claim races never leave AI ticket human-eligible",
      async () => {
        await environment.clearFirestore();
        now = 2_000_000;
        await Promise.all(["a", "b"].map((id) => service!.ensurePlayer(id)));
        await service!.matchmaking(
          "a",
          "enqueue",
          ONLINE_PROTOCOL,
          ONLINE_RULESET,
        );
        now += 10_000;
        const results = await Promise.all([
          service!.matchmaking("a", "poll", ONLINE_PROTOCOL, ONLINE_RULESET),
          service!.matchmaking("b", "enqueue", ONLINE_PROTOCOL, ONLINE_RULESET),
        ]);
        const a = (await db!.doc("queue/a").get()).data()!;
        const lobby = (await db!.doc("serverLobby/current").get()).get(
          "entries",
        ) as { uid: string }[];
        assert.ok(a.status === "fallback" || a.status === "matched");
        assert.equal(
          lobby.some((t) => t.uid === "a"),
          false,
        );
        if (a.status === "fallback")
          assert.equal(results[1].status, "searching");
        else assert.equal(a.matchId, results[1].matchId);
        const cancelled = await service!.matchmaking(
          "a",
          "cancel",
          ONLINE_PROTOCOL,
          ONLINE_RULESET,
        );
        assert.equal(
          cancelled.status,
          a.status === "matched" ? "matched" : "cancelled",
        );
      },
    );
    await t.test(
      "incompatible protocols, expired tickets and cancelled tickets cannot claim",
      async () => {
        await environment.clearFirestore();
        now = 3_000_000;
        await Promise.all(["a", "b"].map((id) => service!.ensurePlayer(id)));
        await assert.rejects(
          () => service!.matchmaking("a", "enqueue", 99, ONLINE_RULESET),
          /Protocol/,
        );
        await service!.matchmaking(
          "a",
          "enqueue",
          ONLINE_PROTOCOL,
          ONLINE_RULESET,
        );
        now += 31_000;
        assert.equal(
          (
            await service!.matchmaking(
              "b",
              "enqueue",
              ONLINE_PROTOCOL,
              ONLINE_RULESET,
            )
          ).status,
          "searching",
        );
        await service!.matchmaking(
          "b",
          "cancel",
          ONLINE_PROTOCOL,
          ONLINE_RULESET,
        );
        assert.equal(
          (
            await service!.matchmaking(
              "a",
              "enqueue",
              ONLINE_PROTOCOL,
              ONLINE_RULESET,
            )
          ).status,
          "searching",
        );
      },
    );
    await t.test(
      "search retries reuse fallback and stale cancellation cannot cancel a new attempt",
      async () => {
        await environment.clearFirestore();
        now = 4_000_000;
        await service!.ensurePlayer("a");
        await service!.matchmaking(
          "a",
          "enqueue",
          ONLINE_PROTOCOL,
          ONLINE_RULESET,
          "first-search",
        );
        now += 10_000;
        const fallback = await service!.matchmaking(
          "a",
          "poll",
          ONLINE_PROTOCOL,
          ONLINE_RULESET,
          "first-search",
        );
        assert.equal(fallback.status, "fallback");
        assert.equal(
          (
            await service!.matchmaking(
              "a",
              "enqueue",
              ONLINE_PROTOCOL,
              ONLINE_RULESET,
              "first-search",
            )
          ).seed,
          fallback.seed,
        );
        assert.equal(
          (
            await service!.matchmaking(
              "a",
              "enqueue",
              ONLINE_PROTOCOL,
              ONLINE_RULESET,
              "second-search",
            )
          ).status,
          "searching",
        );
        const stale = await service!.matchmaking(
          "a",
          "cancel",
          ONLINE_PROTOCOL,
          ONLINE_RULESET,
          "first-search",
        );
        assert.equal(stale.searchId, "second-search");
        assert.equal(stale.status, "searching");
        assert.equal(
          (
            await service!.matchmaking(
              "a",
              "enqueue",
              ONLINE_PROTOCOL,
              ONLINE_RULESET,
              "first-search",
            )
          ).status,
          "cancelled",
        );
        assert.equal(
          (await db!.doc("queue/a").get()).get("searchId"),
          "second-search",
        );
      },
    );
    await t.test(
      "cancel before enqueue persists across an older ticket",
      async () => {
        await environment.clearFirestore();
        now = 5_000_000;
        await service!.ensurePlayer("a");
        await service!.matchmaking(
          "a",
          "enqueue",
          ONLINE_PROTOCOL,
          ONLINE_RULESET,
          "old-search",
        );
        await service!.matchmaking(
          "a",
          "cancel",
          ONLINE_PROTOCOL,
          ONLINE_RULESET,
          "pending-search",
        );
        const late = await service!.matchmaking(
          "a",
          "enqueue",
          ONLINE_PROTOCOL,
          ONLINE_RULESET,
          "pending-search",
        );
        assert.equal(late.status, "cancelled");
        assert.equal(
          (await db!.doc("queue/a").get()).get("searchId"),
          "old-search",
        );
      },
    );
    await t.test(
      "account stats import is idempotent, isolated, and cannot forge ranked results",
      async () => {
        await environment.clearFirestore();
        await service!.ensurePlayer("stats-owner");
        const record = {
          id: "legacy-game",
          date: "2026-09-19",
          durationMs: 20000,
          difficulty: "standard",
          poolSize: 72,
          timerMode: "none",
          isWin: true,
          tilesPlaced: 72,
          gameMode: "solo",
        };
        const archive = {
          totalGames: 600,
          totalWins: 400,
          currentStreak: 0,
          bestStreak: 20,
          bestTimes: { "standard-72": 10000 },
          records: [],
        };
        await service!.migrateStats("stats-owner", "device-one", archive);
        await service!.migrateStats("stats-owner", "device-one", archive);
        await Promise.all([
          service!.syncStats("stats-owner", [record]),
          service!.syncStats("stats-owner", [record]),
        ]);
        const stats = await db!.doc("accountStats/stats-owner").get();
        assert.equal(stats.get("totalGames"), 601);
        assert.equal(stats.get("totalWins"), 401);
        assert.equal(stats.get("bestStreak"), 20);
        assert.equal(
          (await db!.doc("players/stats-owner").get()).get("rating"),
          800,
        );
        await assert.rejects(
          service!.syncStats("stats-owner", [
            { ...record, gameMode: "online" },
          ]),
        );
        const owner = environment
          .authenticatedContext("stats-owner", {
            firebase: { sign_in_provider: "apple.com" },
          })
          .firestore();
        const other = environment
          .authenticatedContext("other", {
            firebase: { sign_in_provider: "password" },
          })
          .firestore();
        await assertSucceeds(getDoc(doc(owner, "accountStats/stats-owner")));
        await assertFails(getDoc(doc(other, "accountStats/stats-owner")));
        await assertFails(
          setDoc(doc(owner, "accountStats/stats-owner"), { totalWins: 9999 }),
        );
        await service!.deleteAccount("stats-owner");
        assert.equal(
          (await db!.doc("accountStats/stats-owner").get()).exists,
          false,
        );
        assert.equal(
          (await db!.collection("accountStats/stats-owner/receipts").get())
            .empty,
          true,
        );
      },
    );
    await t.test(
      "legacy identity upgrades in place and email restores it after sign-out",
      async () => {
        const client = initializeClient(
          { apiKey: "demo-key", projectId: "demo-narnigrams" },
          "upgrade-test",
        );
        const auth = getClientAuth(client);
        connectAuthEmulator(
          auth,
          `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`,
          { disableWarnings: true },
        );
        const identities: (string | null)[] = [];
        const stop = onIdTokenChanged(auth, (user) =>
          identities.push(user && !user.isAnonymous ? user.uid : null),
        );
        try {
          const legacy = await signInAnonymously(auth);
          await service!.ensurePlayer(legacy.user.uid);
          await db!.doc(`players/${legacy.user.uid}`).update({ rating: 1120 });
          const email = `upgrade-${Date.now()}@example.com`;
          await linkWithCredential(
            legacy.user,
            EmailAuthProvider.credential(email, "test-password-123"),
          );
          const token = await auth.currentUser!.getIdToken(true);
          assert.equal(auth.currentUser!.isAnonymous, false);
          assert.equal(auth.currentUser!.uid, legacy.user.uid);
          assert.ok(
            identities.includes(legacy.user.uid),
            "Upgrade must notify the auth provider without changing UID",
          );
          const response = await fetch(
            "http://127.0.0.1:5001/demo-narnigrams/australia-southeast1/ensurePlayer",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ data: {} }),
            },
          );
          assert.equal(response.status, 200);
          assert.equal(
            ((await response.json()) as { result: { rating: number } }).result
              .rating,
            1120,
          );
          await signOut(auth);
          await signInWithEmailAndPassword(auth, email, "test-password-123");
          assert.equal(auth.currentUser!.uid, legacy.user.uid);
        } finally {
          stop();
          await deleteClient(client);
        }
      },
    );
    await t.test("callables reject anonymous accounts", async () => {
      const response = await fetch(
        `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ returnSecureToken: true }),
        },
      );
      const account = (await response.json()) as { idToken: string };
      for (const name of [
        "ensurePlayer",
        "matchmaking",
        "syncStats",
        "migrateStats",
      ]) {
        const result = await fetch(
          `http://127.0.0.1:5001/demo-narnigrams/australia-southeast1/${name}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${account.idToken}`,
            },
            body: JSON.stringify({ data: {} }),
          },
        );
        assert.equal(result.status, 401);
      }
    });
    await t.test(
      "real callable auth, generated profile, queue and account deletion",
      async () => {
        await environment.clearFirestore();
        const response = await fetch(
          `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: `test-${Date.now()}@example.com`,
              password: "test-password-123",
              returnSecureToken: true,
            }),
          },
        );
        const account = (await response.json()) as {
          idToken: string;
          localId: string;
        };
        assert.ok(account.idToken);
        const call = async (name: string, data: unknown) => {
          const result = await fetch(
            `http://127.0.0.1:5001/demo-narnigrams/australia-southeast1/${name}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${account.idToken}`,
              },
              body: JSON.stringify({ data }),
            },
          );
          const payload = (await result.json()) as {
            result?: Record<string, unknown>;
            error?: unknown;
          };
          assert.equal(result.status, 200, JSON.stringify(payload));
          return payload.result;
        };
        const profile = await call("ensurePlayer", {});
        assert.equal(profile?.uid, account.localId);
        assert.equal(profile?.rating, 800);
        assert.match(
          String(profile?.displayName),
          /^[A-Za-z]+ [A-Za-z]+ [A-F0-9]{4}$/,
        );
        const queued = await call("matchmaking", {
          operation: "enqueue",
          protocol: ONLINE_PROTOCOL,
          ruleset: ONLINE_RULESET,
        });
        assert.equal(queued?.status, "searching");
        await db!
          .doc("serverMatches/orphan")
          .set({ public: { playerIds: [account.localId, "other"] } });
        await db!
          .doc(`privatePlayers/orphan_${account.localId}`)
          .set({ uid: account.localId, hand: [] });
        await db!
          .doc(`privatePlayers/straggler_${account.localId}`)
          .set({ uid: account.localId, hand: [] });
        await call("deleteAccount", {});
        assert.equal(
          (await db!.doc("serverMatches/orphan").get()).exists,
          false,
        );
        assert.equal(
          (await db!.doc(`privatePlayers/straggler_${account.localId}`).get())
            .exists,
          false,
        );
        assert.equal(
          (await db!.doc(`players/${account.localId}`).get()).exists,
          false,
        );
        assert.equal(
          (await db!.doc(`queue/${account.localId}`).get()).exists,
          false,
        );
        await assert.rejects(
          () => getAuth(admin).getUser(account.localId),
          /no user record/i,
        );
      },
    );
  },
);
