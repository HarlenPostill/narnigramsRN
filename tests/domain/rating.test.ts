import assert from "node:assert/strict";
import { test } from "node:test";
import { expectedScore, kFactor, settleRating, settleMatchRatings, getRank, RANKS } from "../../shared/rating";
test("ELO expected scores, provisional window, draws and symmetric rounding", () => {
  assert.equal(expectedScore(800,800), 0.5);
  assert.ok(Math.abs(expectedScore(1200,800) - 10 / 11) < 1e-12);
  assert.equal(kFactor(9), 40); assert.equal(kFactor(10), 24);
  assert.equal(settleRating(800,800,0,1).delta, 20);
  assert.equal(settleRating(800,800,10,1).delta, 12);
  assert.equal(settleRating(800,800,0,0.5).delta, 0);
  assert.equal(settleRating(800,800,0,0).delta, -20);
  assert.throws(() => expectedScore(NaN,800));
  assert.throws(() => kFactor(-1));
});
test("rating floor reports actual delta and AI never alters public rating", () => {
  const change = settleRating(2,2,0,0);
  assert.equal(change.postRating,0); assert.equal(change.delta,-2);
  assert.equal(settleRating(800,1600,0,1,false).delta,0);
});
test("forfeit/disconnect settled once from immutable snapshots; bot unranked", () => {
  const input = { matchId: "match", ratings: [800,800] as [number,number], games: [0,10] as [number,number], score: 0 as const, reason: "forfeit" as const, opponentKind: "human" as const };
  const first = settleMatchRatings(input);
  assert.equal(first.players[0].delta,-20); assert.equal(first.players[1].delta,12);
  assert.equal(settleMatchRatings({ ...input, score: 1 },first),first);
  assert.throws(() => settleMatchRatings({ ...input, matchId: "other" },first));
  assert.equal(settleMatchRatings({ ...input, reason: "disconnect" }).players[0].delta,-20);
  const ai = settleMatchRatings({ ...input, opponentKind: "ai" });
  assert.equal(ai.rated,false); assert.ok(ai.players.every((p) => p.delta === 0));
});
test("all rank boundaries derive from one source", () => {
  for (const [index, rank] of RANKS.entries()) {
    assert.equal(getRank(rank.min).label, rank.label);
    assert.equal(getRank(rank.min).color, rank.color);
    if (index > 0) assert.equal(getRank(rank.min-1).label,RANKS[index-1].label);
  }
});
