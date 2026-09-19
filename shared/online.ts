import type { BotDifficulty, Tile } from "../types/game";
export const ONLINE_PROTOCOL = 1;
export const ONLINE_RULESET = "standard-72-esdb-bf635876-v1";
export const FALLBACK_AFTER_MS = 10_000;
export const QUEUE_LEASE_MS = 30_000;
export const RECONNECT_GRACE_MS = 120_000;
export interface PlayerProfile {
  uid: string;
  displayName: string;
  rating: number;
  peakRating?: number;
  games: number;
  wins: number;
  losses: number;
  activeMatchId: string | null;
}
export interface QueueTicket {
  uid: string;
  searchId?: string;
  supersededSearchIds?: string[];
  rating: number;
  enqueuedAt: number;
  expiresAt: number;
  protocol: number;
  ruleset: string;
  status: "searching" | "matched" | "fallback" | "cancelled";
  matchId?: string;
  seed?: string;
  botDifficulty?: BotDifficulty;
  rated?: false;
}
export interface RatingAudit {
  preRating: number;
  expectedScore: number;
  delta: number;
  postRating: number;
}
export interface MatchResult {
  winnerId: string | null;
  reason: "finish" | "forfeit" | "disconnect" | "abandoned";
  settledAt: number;
  rulesVersion: string;
  ratings: Record<string, RatingAudit>;
}
export interface PublicMatch {
  id: string;
  protocol: number;
  ruleset: string;
  playerIds: string[];
  players: Record<
    string,
    Pick<PlayerProfile, "uid" | "displayName" | "rating">
  >;
  status: "active" | "completed" | "abandoned";
  createdAt: number;
  sequence: number;
  poolCount: number;
  handCounts: Record<string, number>;
  lastSeen: Record<string, number>;
  result: MatchResult | null;
  rated: true;
}
export interface PrivatePlayerState {
  hand: Tile[];
  board: Record<string, Tile>;
  sequence: number;
}
export interface MatchSession {
  match: PublicMatch;
  player: PrivatePlayerState;
}
export interface MatchCommand {
  matchId: string;
  commandId: string;
  expectedSequence: number;
  type: "board" | "peel" | "exchange" | "finish" | "forfeit" | "heartbeat";
  board?: Record<string, string>;
  tileId?: string;
}
export type Unsubscribe = () => void;
export interface GameRepositories {
  auth: {
    signIn(email: string, password: string, create: boolean): Promise<void>;
    signInApple(): Promise<void>;
    resetPassword(email: string): Promise<void>;
    signOut(): Promise<void>;
    ensurePlayer(): Promise<PlayerProfile>;
    currentUid(): string | null;
    accountInfo(): { email: string | null; providers: string[] };
    watchAuth(next: (uid: string | null) => void): Unsubscribe;
    deleteAccount(): Promise<void>;
  };
  stats: {
    migrate(
      id: string,
      stats: import("../types/game").GameStats,
    ): Promise<void>;
    sync(records: import("../types/game").GameRecord[]): Promise<void>;
    watch(
      next: (stats: import("../types/game").GameStats | null) => void,
      error: (error: Error) => void,
    ): Unsubscribe;
  };
  profiles: {
    update(displayName: string): Promise<PlayerProfile>;
    get(): Promise<PlayerProfile | null>;
    watch(
      next: (profile: PlayerProfile | null) => void,
      error: (error: Error) => void,
    ): Unsubscribe;
  };
  matchmaking: {
    enqueue(searchId?: string): Promise<QueueTicket>;
    poll(searchId?: string): Promise<QueueTicket>;
    cancel(searchId?: string): Promise<QueueTicket>;
    watch(
      next: (ticket: QueueTicket | null) => void,
      error: (error: Error) => void,
    ): Unsubscribe;
  };
  matches: {
    watch(
      matchId: string,
      next: (session: MatchSession) => void,
      error: (error: Error) => void,
    ): Unsubscribe;
    command(command: MatchCommand): Promise<MatchSession>;
  };
}
