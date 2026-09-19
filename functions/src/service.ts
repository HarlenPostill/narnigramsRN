import { normalizeDisplayName } from "../../shared/profile";
import { addRecord, emptyStats, validOfflineRecord } from "../../shared/stats";
import type { GameStats } from "../../types/game";
import { randomUUID, createHash } from "node:crypto";
import { getAuth } from "firebase-admin/auth";
import {
  Timestamp,
  type Firestore,
  type Transaction,
} from "firebase-admin/firestore";
import { INITIAL_RATING, settleRating } from "../../shared/rating";
import {
  ONLINE_PROTOCOL,
  ONLINE_RULESET,
  QUEUE_LEASE_MS,
  type MatchCommand,
  type MatchResult,
  type MatchSession,
  type PlayerProfile,
  type QueueTicket,
} from "../../shared/online";
import {
  applyCommand,
  closestOpponent,
  createMatch,
  DomainError,
  fallbackDifficulty,
  fallbackReady,
  type CommandOutcome,
  type ServerMatch,
} from "./domain";
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const ticketExpiry = (now: number) =>
  Timestamp.fromMillis(now + 24 * 60 * 60 * 1000);
export class GameService {
  constructor(
    private db: Firestore,
    private dictionary: Set<string>,
    private clock: () => number = Date.now,
  ) {}
  async migrateStats(uid: string, id: unknown, value: unknown) {
    const stats = value as GameStats;
    if (
      typeof id !== "string" ||
      !/^[a-zA-Z0-9_-]{1,180}$/.test(id) ||
      !stats ||
      ![
        stats.totalGames,
        stats.totalWins,
        stats.currentStreak,
        stats.bestStreak,
      ].every((n) => Number.isSafeInteger(n) && n >= 0 && n <= 10000000) ||
      stats.totalWins > stats.totalGames ||
      !stats.bestTimes ||
      typeof stats.bestTimes !== "object" ||
      !Array.isArray(stats.records) ||
      stats.records.length !== 0 ||
      Object.entries(stats.bestTimes).some(
        ([key, n]) =>
          !/^(easy|standard|hard)-(50|72|100)$/.test(key) ||
          !Number.isFinite(n) ||
          n! < 0,
      )
    )
      throw new DomainError("invalid-argument", "Invalid legacy stats.");
    for (const mode of ["solo", "bot"] as const) {
      const count = stats.byMode?.[mode];
      if (
        count &&
        (![count.games, count.wins].every(
          (n) => Number.isSafeInteger(n) && n >= 0 && n <= stats.totalGames,
        ) ||
          count.wins > count.games)
      )
        throw new DomainError(
          "invalid-argument",
          "Invalid legacy mode counts.",
        );
    }
    await this.db.runTransaction(async (tx) => {
      const ref = this.db.doc(`accountStats/${uid}`);
      const receipt = ref.collection("migrations").doc(id);
      const [profile, current, imported] = await tx.getAll(
        this.db.doc(`players/${uid}`),
        ref,
        receipt,
      );
      if (!profile.exists || profile.get("deleting"))
        throw new DomainError("failed-precondition", "Account unavailable.");
      if (imported.exists) return;
      const merged = current.exists
        ? (current.data() as GameStats)
        : emptyStats();
      merged.totalGames += stats.totalGames;
      merged.totalWins += stats.totalWins;
      for (const mode of ["solo", "bot"] as const) {
        const count = stats.byMode?.[mode];
        if (count) {
          const old = merged.byMode?.[mode] ?? { games: 0, wins: 0 };
          merged.byMode = {
            ...merged.byMode,
            [mode]: {
              games: old.games + count.games,
              wins: old.wins + count.wins,
            },
          };
        }
      }
      merged.bestStreak = Math.max(merged.bestStreak, stats.bestStreak);
      if (!current.exists) merged.currentStreak = stats.currentStreak;
      for (const [key, n] of Object.entries(stats.bestTimes)) {
        const k = key as keyof GameStats["bestTimes"];
        merged.bestTimes[k] = Math.min(merged.bestTimes[k] ?? Infinity, n!);
      }
      tx.set(ref, merged);
      tx.create(receipt, { imported: true });
    });
  }
  async syncStats(uid: string, records: unknown) {
    if (
      !Array.isArray(records) ||
      records.length > 100 ||
      !records.every(validOfflineRecord)
    )
      throw new DomainError("invalid-argument", "Invalid game records.");
    await this.db.runTransaction(async (tx) => {
      const profile = await tx.get(this.db.doc(`players/${uid}`));
      if (!profile.exists || profile.get("deleting"))
        throw new DomainError("failed-precondition", "Account unavailable.");
      const ref = this.db.doc(`accountStats/${uid}`);
      const current = await tx.get(ref);
      const unique = [...new Map(records.map((r) => [r.id, r])).values()];
      const refs = unique.map((r) => ref.collection("receipts").doc(r.id));
      const receipts = refs.length ? await tx.getAll(...refs) : [];
      let stats = current.exists ? (current.data() as GameStats) : emptyStats();
      unique.forEach((record, index) => {
        if (!receipts[index].exists) {
          stats = addRecord(stats, record);
          tx.create(refs[index], { imported: true });
        }
      });
      tx.set(ref, stats);
    });
  }
  async ensurePlayer(uid: string): Promise<PlayerProfile> {
    return this.db.runTransaction(async (tx) => {
      const ref = this.db.doc(`players/${uid}`);
      const snap = await tx.get(ref);
      if (snap.exists) {
        if (snap.get("deleting"))
          throw new DomainError(
            "failed-precondition",
            "Account deletion is in progress.",
          );
        return snap.data() as PlayerProfile;
      }
      const code = createHash("sha256").update(uid).digest("hex");
      const adjectives = [
        "Bright",
        "Calm",
        "Clever",
        "Golden",
        "Quiet",
        "Swift",
        "Silver",
        "Sunny",
      ];
      const animals = [
        "Otter",
        "Owl",
        "Robin",
        "Panda",
        "Finch",
        "Fox",
        "Koala",
        "Wren",
      ];
      const profile: PlayerProfile = {
        uid,
        displayName: `${adjectives[parseInt(code[0], 16) % 8]} ${animals[parseInt(code[1], 16) % 8]} ${code.slice(2, 6).toUpperCase()}`,
        rating: INITIAL_RATING,
        games: 0,
        wins: 0,
        losses: 0,
        activeMatchId: null,
      };
      tx.create(ref, profile);
      return profile;
    });
  }
  async updateProfile(uid: string, value: unknown): Promise<PlayerProfile> {
    const displayName = normalizeDisplayName(value);
    if (!displayName)
      throw new DomainError(
        "invalid-argument",
        "Use 1–30 characters without control characters.",
      );
    return this.db.runTransaction(async (tx) => {
      const ref = this.db.doc(`players/${uid}`);
      const snap = await tx.get(ref);
      if (!snap.exists || snap.get("deleting"))
        throw new DomainError("failed-precondition", "Account unavailable.");
      tx.update(ref, { displayName });
      return { ...(snap.data() as PlayerProfile), displayName };
    });
  }
  async matchmaking(
    uid: string,
    operation: "enqueue" | "poll" | "cancel",
    protocol: number,
    ruleset: string,
    searchId?: string,
  ): Promise<QueueTicket> {
    if (protocol !== ONLINE_PROTOCOL || ruleset !== ONLINE_RULESET)
      throw new DomainError(
        "failed-precondition",
        "Protocol mismatch. Update the app.",
      );
    if (!["enqueue", "poll", "cancel"].includes(operation))
      throw new DomainError("invalid-argument", "Unknown queue operation.");
    if (
      searchId !== undefined &&
      (typeof searchId !== "string" || !/^[A-Za-z0-9_-]{8,100}$/.test(searchId))
    )
      throw new DomainError("invalid-argument", "Invalid search ID.");
    const matchId = randomUUID();
    const seed = randomUUID();
    return this.db.runTransaction(async (tx) => {
      const now = this.clock();
      const profileRef = this.db.doc(`players/${uid}`);
      const queueRef = this.db.doc(`queue/${uid}`);
      const lobbyRef = this.db.doc("serverLobby/current");
      const [profileSnap, ticketSnap, lobbySnap] = await tx.getAll(
        profileRef,
        queueRef,
        lobbyRef,
      );
      const searchRef = searchId
        ? this.db.doc(`serverSearches/${uid}_${searchId}`)
        : undefined;
      const searchReceipt = searchRef ? await tx.get(searchRef) : undefined;
      const profile = profileSnap.data() as PlayerProfile | undefined;
      if (!profile || profileSnap.get("deleting"))
        throw new DomainError(
          "failed-precondition",
          "Create your player before searching.",
        );
      const previous = ticketSnap.data() as QueueTicket | undefined;
      // A durable active pointer always beats queue retries, cancellations and fallback races.
      if (profile.activeMatchId)
        return {
          ...(previous ?? {
            uid,
            rating: profile.rating,
            enqueuedAt: now,
            expiresAt: now,
            protocol,
            ruleset,
          }),
          status: "matched",
          matchId: profile.activeMatchId,
        };
      if (operation === "cancel" && searchRef)
        tx.set(searchRef, {
          uid,
          status: "cancelled",
          deleteAfter: ticketExpiry(now),
        });
      if (searchReceipt?.exists && operation !== "cancel")
        return {
          uid,
          ...(searchId ? { searchId } : {}),
          rating: profile.rating,
          enqueuedAt: now,
          expiresAt: now,
          protocol,
          ruleset,
          status: "cancelled",
        };
      if (
        previous &&
        searchId &&
        previous.supersededSearchIds?.includes(searchId)
      )
        return previous;
      if (
        previous &&
        searchId &&
        ((operation !== "enqueue" && previous.searchId !== searchId) ||
          (previous.searchId === searchId && previous.status !== "searching"))
      )
        return previous;
      const entries = (
        (lobbySnap.data()?.entries ?? []) as QueueTicket[]
      ).filter((t) => t.expiresAt > now && t.uid !== uid);
      let ticket: QueueTicket =
        previous && previous.status === "searching" && previous.expiresAt > now
          ? previous
          : {
              uid,
              rating: profile.rating,
              enqueuedAt: now,
              expiresAt: now + QUEUE_LEASE_MS,
              protocol,
              ruleset,
              status: "searching",
            };
      if (searchId)
        ticket = {
          ...ticket,
          searchId,
          supersededSearchIds: [
            ...(previous?.supersededSearchIds ?? []),
            ...(previous?.searchId && previous.searchId !== searchId
              ? [previous.searchId]
              : []),
          ].slice(-64),
        };
      if (operation === "cancel") {
        ticket = { ...ticket, status: "cancelled" };
      } else if (
        operation === "poll" &&
        previous &&
        previous.status !== "searching"
      ) {
        return previous;
      } else {
        const other = closestOpponent(ticket, entries, now);
        if (other) {
          const otherRef = this.db.doc(`players/${other.uid}`);
          const otherSnap = await tx.get(otherRef);
          const opponent = otherSnap.data() as PlayerProfile | undefined;
          if (
            opponent &&
            !otherSnap.get("deleting") &&
            !opponent.activeMatchId
          ) {
            const match = createMatch(matchId, seed, [opponent, profile], now);
            this.writeMatch(tx, match, now);
            tx.update(profileRef, { activeMatchId: matchId });
            tx.update(otherRef, { activeMatchId: matchId });
            ticket = { ...ticket, status: "matched", matchId };
            tx.set(this.db.doc(`queue/${other.uid}`), {
              ...other,
              status: "matched",
              matchId,
              deleteAfter: ticketExpiry(now),
            });
            const remaining = entries.filter((t) => t.uid !== other.uid);
            tx.set(lobbyRef, { entries: remaining });
            tx.set(queueRef, { ...ticket, deleteAfter: ticketExpiry(now) });
            return ticket;
          }
        }
        if (fallbackReady(ticket, now))
          ticket = {
            ...ticket,
            status: "fallback",
            seed,
            botDifficulty: fallbackDifficulty(profile.rating),
            rated: false,
          };
        else {
          if (entries.length >= 128)
            throw new DomainError(
              "resource-exhausted",
              "Matchmaking is busy. Try again shortly.",
            );
          ticket = { ...ticket, expiresAt: now + QUEUE_LEASE_MS };
          entries.push(ticket);
        }
      }
      tx.set(lobbyRef, { entries });
      tx.set(queueRef, { ...ticket, deleteAfter: ticketExpiry(now) });
      return ticket;
    });
  }
  private writeMatch(tx: Transaction, match: ServerMatch, now: number) {
    const deleteAfter = Timestamp.fromMillis(now + RETENTION_MS);
    tx.set(this.db.doc(`serverMatches/${match.public.id}`), {
      ...match,
      deleteAfter,
    });
    tx.set(this.db.doc(`matches/${match.public.id}`), {
      ...match.public,
      deleteAfter,
      ...(match.public.status === "active"
        ? {
            cleanupAt:
              Math.max(...Object.values(match.public.lastSeen)) + 120_000,
          }
        : {}),
    });
    for (const uid of match.public.playerIds)
      tx.set(this.db.doc(`privatePlayers/${match.public.id}_${uid}`), {
        ...match.players[uid],
        uid,
        deleteAfter,
      });
  }
  private async settle(tx: Transaction, outcome: CommandOutcome, now: number) {
    const { match, winnerId, reason } = outcome;
    if (!reason || match.public.result) return;
    const refs = match.public.playerIds.map((uid) =>
      this.db.doc(`players/${uid}`),
    );
    const profiles = await tx.getAll(...refs);
    const ratings: MatchResult["ratings"] = {};
    for (let i = 0; i < profiles.length; i++) {
      const uid = match.public.playerIds[i];
      const opponent = match.public.playerIds[1 - i];
      const pre = match.public.players[uid].rating;
      const audit = settleRating(
        pre,
        match.public.players[opponent].rating,
        match.gamesAtStart[uid],
        winnerId === null ? 0.5 : winnerId === uid ? 1 : 0,
        reason !== "abandoned",
      );
      ratings[uid] = audit;
      if (profiles[i].exists) {
        const p = profiles[i].data() as PlayerProfile;
        tx.update(refs[i], {
          activeMatchId: null,
          rating: audit.postRating,
          peakRating: Math.max(p.peakRating ?? p.rating, audit.postRating),
          games: p.games + (reason === "abandoned" ? 0 : 1),
          wins: p.wins + (winnerId === uid ? 1 : 0),
          losses: p.losses + (winnerId !== null && winnerId !== uid ? 1 : 0),
        });
      }
    }
    match.public.status = reason === "abandoned" ? "abandoned" : "completed";
    match.public.result = {
      winnerId: winnerId ?? null,
      reason,
      settledAt: now,
      rulesVersion: ONLINE_RULESET,
      ratings,
    };
    match.public.sequence++;
    for (const p of Object.values(match.players))
      p.sequence = match.public.sequence;
  }
  async command(uid: string, command: MatchCommand): Promise<MatchSession> {
    if (
      typeof command.matchId !== "string" ||
      !/^[A-Za-z0-9_-]{1,100}$/.test(command.matchId)
    )
      throw new DomainError("invalid-argument", "Invalid match ID.");
    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(
        this.db.doc(`serverMatches/${command.matchId}`),
      );
      if (!snap.exists)
        throw new DomainError("not-found", "Match no longer exists.");
      const now = this.clock();
      const outcome = applyCommand(
        snap.data() as ServerMatch,
        uid,
        command,
        now,
        this.dictionary,
      );
      if (!outcome.duplicate) {
        await this.settle(tx, outcome, now);
        this.writeMatch(tx, outcome.match, now);
      }
      return {
        match: outcome.match.public,
        player: outcome.match.players[uid],
      };
    });
  }
  async deleteAccount(uid: string) {
    // Lock first: prevents enqueue and account recreation during paged data removal.
    const active = await this.db.runTransaction(async (tx) => {
      const profileRef = this.db.doc(`players/${uid}`);
      const lobbyRef = this.db.doc("serverLobby/current");
      const [profile, lobby] = await tx.getAll(profileRef, lobbyRef);
      tx.set(profileRef, { deleting: true }, { merge: true });
      tx.set(lobbyRef, {
        entries: ((lobby.data()?.entries ?? []) as QueueTicket[]).filter(
          (t) => t.uid !== uid,
        ),
      });
      tx.delete(this.db.doc(`queue/${uid}`));
      return profile.get("activeMatchId") as string | undefined;
    });
    if (active)
      await this.command(uid, {
        matchId: active,
        commandId: `delete-${randomUUID()}`,
        expectedSequence: 0,
        type: "forfeit",
      });
    // History is deliberately deleted for both parties on account erasure; no personal game archive is retained.
    for (;;) {
      const matches = await this.db
        .collection("matches")
        .where("playerIds", "array-contains", uid)
        .limit(50)
        .get();
      if (matches.empty) break;
      const batch = this.db.batch();
      for (const match of matches.docs) {
        batch.delete(match.ref);
        batch.delete(this.db.doc(`serverMatches/${match.id}`));
        for (const id of match.get("playerIds") as string[])
          batch.delete(this.db.doc(`privatePlayers/${match.id}_${id}`));
      }
      await batch.commit();
    }
    // TTL deletion is asynchronous per document; erase stragglers even when a public match already expired.
    for (;;) {
      const hidden = await this.db
        .collection("serverMatches")
        .where("public.playerIds", "array-contains", uid)
        .limit(50)
        .get();
      if (hidden.empty) break;
      const batch = this.db.batch();
      for (const match of hidden.docs) {
        batch.delete(match.ref);
        batch.delete(this.db.doc(`matches/${match.id}`));
        for (const id of match.get("public.playerIds") as string[])
          batch.delete(this.db.doc(`privatePlayers/${match.id}_${id}`));
      }
      await batch.commit();
    }
    for (;;) {
      const privateDocs = await this.db
        .collection("privatePlayers")
        .where("uid", "==", uid)
        .limit(100)
        .get();
      if (privateDocs.empty) break;
      const batch = this.db.batch();
      privateDocs.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }
    for (;;) {
      const receipts = await this.db
        .collection("serverSearches")
        .where("uid", "==", uid)
        .limit(100)
        .get();
      if (receipts.empty) break;
      const batch = this.db.batch();
      receipts.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }
    try {
      await this.db.recursiveDelete(this.db.doc(`accountStats/${uid}`));
      await getAuth().deleteUser(uid);
    } catch (error) {
      if ((error as { code?: string }).code !== "auth/user-not-found")
        throw error;
    }
    await this.db.doc(`players/${uid}`).delete();
  }
  async cleanup() {
    const now = this.clock();
    await this.db.runTransaction(async (tx) => {
      const ref = this.db.doc("serverLobby/current");
      const snap = await tx.get(ref);
      tx.set(ref, {
        entries: ((snap.data()?.entries ?? []) as QueueTicket[]).filter(
          (t) => t.expiresAt > now,
        ),
      });
    });
    // Bounded scan: active games expire naturally, leases are adjudicated without client clocks.
    const stale = await this.db
      .collection("matches")
      .where("cleanupAt", "<=", now)
      .orderBy("cleanupAt")
      .limit(100)
      .get();
    for (const doc of stale.docs) {
      const ids = doc.get("playerIds") as string[];
      const seen = doc.get("lastSeen") as Record<string, number>;
      if (ids.every((id) => now - seen[id] >= 120_000))
        await this.command(ids[0], {
          matchId: doc.id,
          commandId: `cleanup-${randomUUID()}`,
          expectedSequence: 0,
          type: "heartbeat",
        });
    }
  }
}
