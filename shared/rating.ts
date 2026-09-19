/** Rating protocol 1: human-only; settled once transactionally by the server. */
export const RATING_VERSION = 1;
export const INITIAL_RATING = 800;
export const RATING_FLOOR = 0;
export const RANKS = [
  { min: 0, label: "BRONZE", color: "#CD7F32" },
  { min: 400, label: "SILVER", color: "#C0C0C0" },
  { min: 800, label: "GOLD", color: "#FFC800" },
  { min: 1200, label: "PLATINUM", color: "#8E8E93" },
  { min: 1600, label: "DIAMOND", color: "#5AC8FA" },
  { min: 2000, label: "MASTER", color: "#FF2D55" },
] as const;
export function expectedScore(rating: number, opponent: number): number {
  if (![rating, opponent].every((value) => Number.isFinite(value) && value >= 0)) throw new Error("Invalid rating");
  return 1 / (1 + 10 ** ((opponent - rating) / 400));
}
export function kFactor(settledHumanGames: number): number {
  if (!Number.isInteger(settledHumanGames) || settledHumanGames < 0) throw new Error("Invalid game count");
  return settledHumanGames < 10 ? 40 : 24;
}
export interface RatingChange {
  preRating: number; expectedScore: number; delta: number; postRating: number; k: number; rulesVersion: number;
}
export function settleRating(rating: number, opponent: number, games: number, score: 0 | 0.5 | 1, rated = true): RatingChange {
  if (![0, 0.5, 1].includes(score)) throw new Error("Invalid score");
  const expected = expectedScore(rating, opponent);
  const k = kFactor(games);
  const raw = k * (score - expected);
  const delta = rated ? Math.sign(raw) * Math.round(Math.abs(raw)) : 0;
  const postRating = Math.max(RATING_FLOOR, rating + delta);
  return { preRating: rating, expectedScore: expected, delta: postRating - rating, postRating, k, rulesVersion: RATING_VERSION };
}
export type SettlementReason = "finish" | "forfeit" | "disconnect" | "draw";
export interface RatingSettlement { matchId: string; reason: SettlementReason; rated: boolean; players: [RatingChange, RatingChange] }
export function settleMatchRatings(input: { matchId: string; ratings: [number, number]; games: [number, number]; score: 0 | 0.5 | 1; reason: SettlementReason; opponentKind: "human" | "ai" }, existing?: RatingSettlement): RatingSettlement {
  if (existing) {
    if (existing.matchId !== input.matchId) throw new Error("Settlement belongs to another match");
    return existing;
  }
  const rated = input.opponentKind === "human";
  return { matchId: input.matchId, reason: input.reason, rated, players: [
    settleRating(input.ratings[0], input.ratings[1], input.games[0], input.score, rated),
    settleRating(input.ratings[1], input.ratings[0], input.games[1], (1 - input.score) as 0 | 0.5 | 1, rated),
  ] };
}
export function calculateElo(winnerElo: number, loserElo: number, winnerGames = 0, loserGames = 0) {
  const winner = settleRating(winnerElo, loserElo, winnerGames, 1);
  const loser = settleRating(loserElo, winnerElo, loserGames, 0);
  return { newWinnerElo: winner.postRating, newLoserElo: loser.postRating, winnerDelta: winner.delta, loserDelta: loser.delta };
}
export function getRank(elo: number): { label: string; color: string } {
  return [...RANKS].reverse().find((rank) => elo >= rank.min) ?? RANKS[0];
}
