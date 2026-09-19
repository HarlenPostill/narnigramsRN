import { createHash } from "node:crypto";
import {
  createTilePool,
  validateBoard,
  validateBoardWords,
} from "../../utils/game-engine";
import { extractWords } from "../../utils/word-extraction";
import type { Tile } from "../../types/game";
import {
  FALLBACK_AFTER_MS,
  ONLINE_PROTOCOL,
  ONLINE_RULESET,
  RECONNECT_GRACE_MS,
  type MatchCommand,
  type PlayerProfile,
  type PrivatePlayerState,
  type PublicMatch,
  type QueueTicket,
} from "../../shared/online";

export const MUTATION_REPLAY_LIMIT = 128;

export class DomainError extends Error {
  constructor(
    public readonly code:
      | "invalid-argument"
      | "failed-precondition"
      | "permission-denied"
      | "not-found"
      | "resource-exhausted",
    message: string,
  ) {
    super(message);
  }
}
export function ratingWindow(elapsedMs: number) {
  return Math.min(400, 100 + Math.floor(Math.max(0, elapsedMs) / 2500) * 75);
}
export function closestOpponent(
  ticket: QueueTicket,
  candidates: QueueTicket[],
  now: number,
): QueueTicket | undefined {
  return candidates
    .filter(
      (other) =>
        other.uid !== ticket.uid &&
        other.status === "searching" &&
        other.expiresAt > now &&
        other.protocol === ticket.protocol &&
        other.ruleset === ticket.ruleset &&
        Math.abs(other.rating - ticket.rating) <=
          Math.min(
            ratingWindow(now - ticket.enqueuedAt),
            ratingWindow(now - other.enqueuedAt),
          ),
    )
    .sort(
      (a, b) =>
        Math.abs(a.rating - ticket.rating) -
          Math.abs(b.rating - ticket.rating) ||
        a.enqueuedAt - b.enqueuedAt ||
        a.uid.localeCompare(b.uid),
    )[0];
}
export function fallbackReady(ticket: QueueTicket, now: number) {
  return now - ticket.enqueuedAt >= FALLBACK_AFTER_MS;
}
export function fallbackDifficulty(rating: number): "easy" | "medium" | "hard" {
  return rating < 700 ? "easy" : rating < 1300 ? "medium" : "hard";
}
export interface ServerMatch {
  public: PublicMatch;
  pool: Tile[];
  players: Record<string, PrivatePlayerState>;
  gamesAtStart: Record<string, number>;
  processed: string[];
  replayFloor?: number;
}
export function createMatch(
  id: string,
  seed: string,
  profiles: PlayerProfile[],
  now: number,
): ServerMatch {
  // Offline IDs contain their seed for replay. Online IDs must not reveal that
  // seed or the opponent's future hand; use cryptographic opaque identities and order.
  const digest = (value: string) =>
    createHash("sha256").update(value).digest("hex");
  const pool = createTilePool(72, "standard", seed)
    .map((tile) => ({
      tile: { ...tile, id: digest(`identity:${seed}:${tile.id}`) },
      order: digest(`order:${seed}:${tile.id}`),
    }))
    .sort((a, b) => a.order.localeCompare(b.order))
    .map((entry) => entry.tile);
  const players: ServerMatch["players"] = {};
  const visible: PublicMatch["players"] = {};
  const lastSeen: Record<string, number> = {};
  const handCounts: Record<string, number> = {};
  const gamesAtStart: Record<string, number> = {};
  profiles.forEach((p, i) => {
    players[p.uid] = {
      hand: pool.slice(i * 15, (i + 1) * 15),
      board: {},
      sequence: 0,
    };
    visible[p.uid] = {
      uid: p.uid,
      displayName: p.displayName,
      rating: p.rating,
    };
    lastSeen[p.uid] = now;
    handCounts[p.uid] = 15;
    gamesAtStart[p.uid] = p.games;
  });
  return {
    public: {
      id,
      protocol: ONLINE_PROTOCOL,
      ruleset: ONLINE_RULESET,
      playerIds: profiles.map((p) => p.uid),
      players: visible,
      status: "active",
      createdAt: now,
      sequence: 0,
      poolCount: 42,
      handCounts,
      lastSeen,
      result: null,
      rated: true,
    },
    pool: pool.slice(30),
    players,
    gamesAtStart,
    processed: [],
    replayFloor: 0,
  };
}
function requireCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new DomainError("failed-precondition", message);
}
function submittedBoard(
  player: PrivatePlayerState,
  input: Record<string, string>,
): PrivatePlayerState {
  requireCondition(
    input && typeof input === "object" && !Array.isArray(input),
    "Board must be a position map.",
  );
  const owned = new Map(
    [...player.hand, ...Object.values(player.board)].map((t) => [t.id, t]),
  );
  const board: Record<string, Tile> = {};
  const used = new Set<string>();
  requireCondition(Object.keys(input).length <= 72, "Too many tiles.");
  for (const [position, id] of Object.entries(input)) {
    requireCondition(
      /^(?:[0-9]|[1-3][0-9]),(?:[0-9]|[1-3][0-9])$/.test(position),
      "Invalid board position.",
    );
    const tile = owned.get(id);
    requireCondition(
      tile && !used.has(id),
      "Board contains unowned or duplicate tiles.",
    );
    used.add(id);
    board[position] = tile;
  }
  return {
    ...player,
    board,
    hand: [...owned.values()].filter((t) => !used.has(t.id)),
  };
}
function validCompleteBoard(
  player: PrivatePlayerState,
  dictionary: Set<string>,
) {
  return (
    player.hand.length === 0 &&
    validateBoard(player.board) &&
    extractWords(player.board).length > 0 &&
    validateBoardWords(player.board, dictionary).valid
  );
}
export interface CommandOutcome {
  match: ServerMatch;
  winnerId?: string | null;
  reason?: "finish" | "forfeit" | "disconnect" | "abandoned";
  duplicate?: boolean;
}
export function applyCommand(
  original: ServerMatch,
  uid: string,
  command: MatchCommand,
  now: number,
  dictionary: Set<string>,
): CommandOutcome {
  if (!original.public.playerIds.includes(uid))
    throw new DomainError(
      "permission-denied",
      "You are not a member of this match.",
    );
  requireCondition(
    typeof command.commandId === "string" &&
      /^[A-Za-z0-9_-]{8,100}$/.test(command.commandId),
    "Invalid command ID.",
  );
  const key = `${uid}:${command.commandId}`;
  if (original.processed.includes(key) || original.public.status !== "active")
    return { match: original, duplicate: true };
  const match: ServerMatch = structuredClone(original);
  // Existing sessions may have an older cache containing heartbeat IDs. Start a
  // new mutation-only window at their current sequence without trusting that cache.
  if (match.replayFloor === undefined) {
    match.replayFloor = match.public.sequence;
    match.processed = [];
  }
  const opponent = match.public.playerIds.find((id) => id !== uid)!;
  // Only a server-observed lease grants a disconnect win. Two expired leases abandon without rating.
  if (now - match.public.lastSeen[opponent] >= RECONNECT_GRACE_MS) {
    const both = now - match.public.lastSeen[uid] >= RECONNECT_GRACE_MS;
    return {
      match,
      winnerId: both ? null : uid,
      reason: both ? "abandoned" : "disconnect",
    };
  }
  match.public.lastSeen[uid] = now;
  if (
    command.type !== "heartbeat" &&
    command.type !== "forfeit" &&
    command.type !== "board"
  )
    requireCondition(
      command.expectedSequence === match.public.sequence,
      "State changed; reconcile the latest snapshot and retry.",
    );
  requireCondition(
    ["board", "peel", "exchange", "finish", "forfeit", "heartbeat"].includes(
      command.type,
    ),
    "Unknown match action.",
  );
  if (command.type === "board")
    requireCondition(
      Number.isSafeInteger(command.expectedSequence) &&
        command.expectedSequence >= 0 &&
        command.expectedSequence <= match.public.sequence &&
        command.expectedSequence >=
          Math.max(
            match.replayFloor,
            match.public.sequence - MUTATION_REPLAY_LIMIT,
          ),
      "Board snapshot is outside the replay window; reconcile the latest snapshot and retry.",
    );
  if (
    command.board &&
    command.type !== "heartbeat" &&
    command.type !== "forfeit"
  )
    match.players[uid] = submittedBoard(match.players[uid], command.board);
  const player = match.players[uid];
  if (command.type === "peel") {
    requireCondition(
      validCompleteBoard(player, dictionary),
      "Place all your tiles in connected valid words before peeling.",
    );
    requireCondition(
      match.pool.length >= 2,
      "The shared pool is exhausted; finish instead.",
    );
    for (const id of match.public.playerIds)
      match.players[id].hand.push(match.pool.shift()!);
  } else if (command.type === "exchange") {
    const index = player.hand.findIndex((t) => t.id === command.tileId);
    requireCondition(index >= 0, "Only a tile in your hand may be exchanged.");
    requireCondition(match.pool.length >= 2, "Not enough tiles to exchange.");
    const returned = player.hand.splice(index, 1)[0];
    player.hand.push(...match.pool.splice(0, 2));
    match.pool.push(returned);
  } else if (command.type === "finish") {
    requireCondition(
      match.pool.length < 2 && validCompleteBoard(player, dictionary),
      "A win requires an exhausted shared pool and all owned tiles in valid connected words.",
    );
  }
  // Every mutation advances reconciliation order, while board commands may use
  // a stale sequence because ownership is revalidated against current inventory.
  if (command.type !== "heartbeat") match.public.sequence++;
  match.public.poolCount = match.pool.length;
  for (const id of match.public.playerIds) {
    match.players[id].sequence = match.public.sequence;
    match.public.handCounts[id] = match.players[id].hand.length;
  }
  // Presence is a current authenticated lease refresh, not a game mutation.
  // Excluding it preserves the mutation cache's correspondence with sequence.
  // Any evicted mutation's original expectedSequence is then necessarily older
  // than the board acceptance window, so replay cannot become valid again.
  if (command.type !== "heartbeat")
    match.processed = [...match.processed, key].slice(-MUTATION_REPLAY_LIMIT);
  if (command.type === "finish")
    return { match, winnerId: uid, reason: "finish" };
  if (command.type === "forfeit")
    return { match, winnerId: opponent, reason: "forfeit" };
  return { match };
}
