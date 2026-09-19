import test from "node:test";
import assert from "node:assert/strict";
import {
  applyCommand,
  closestOpponent,
  createMatch,
  fallbackReady,
  ratingWindow,
} from "../../functions/src/domain";
import {
  ONLINE_PROTOCOL,
  ONLINE_RULESET,
  type PlayerProfile,
  type QueueTicket,
} from "../../shared/online";
const profile = (uid: string, rating = 800): PlayerProfile => ({
  uid,
  rating,
  displayName: uid,
  games: 0,
  wins: 0,
  losses: 0,
  activeMatchId: null,
});
const ticket = (uid: string, rating = 800, enqueuedAt = 0): QueueTicket => ({
  uid,
  rating,
  enqueuedAt,
  expiresAt: 30_000,
  protocol: ONLINE_PROTOCOL,
  ruleset: ONLINE_RULESET,
  status: "searching",
});
const command = (
  type: "board" | "peel" | "exchange" | "finish" | "forfeit" | "heartbeat",
  extra = {},
) => ({
  matchId: "match",
  commandId: "command-0001",
  expectedSequence: 0,
  type,
  ...extra,
});
test("rating windows and exact ten-second boundary", () => {
  assert.deepEqual(
    [0, 2499, 2500, 5000, 7500, 10000, 90000].map(ratingWindow),
    [100, 100, 175, 250, 325, 400, 400],
  );
  assert.equal(fallbackReady(ticket("a"), 9999), false);
  assert.equal(fallbackReady(ticket("a"), 10000), true);
});
test("closest then oldest, mutual window, self/version/expired excluded", () => {
  const a = ticket("a");
  const candidates = [
    ticket("a"),
    ticket("far", 1000),
    ticket("near", 850, 20),
    ticket("older", 850, 10),
    { ...ticket("bad"), protocol: 2 },
    { ...ticket("expired"), expiresAt: 1 },
  ];
  assert.equal(closestOpponent(a, candidates, 100)?.uid, "older");
  assert.equal(
    closestOpponent(a, [ticket("new", 1100, 9900)], 10000),
    undefined,
  );
});
test("initial authoritative shared economy has all 72 stable unique tiles", () => {
  const a = createMatch("match", "seed", [profile("a"), profile("b")], 0);
  const b = createMatch("match", "seed", [profile("a"), profile("b")], 0);
  assert.deepEqual(a, b);
  assert.ok(a.players.a.hand.every((tile) => /^[a-f0-9]{64}$/.test(tile.id)));
  assert.equal(
    new Set(
      [...a.pool, ...a.players.a.hand, ...a.players.b.hand].map((t) => t.id),
    ).size,
    72,
  );
});
test("ownership, duplicate IDs and impossible finish are rejected", () => {
  const match = createMatch("match", "seed", [profile("a"), profile("b")], 0);
  assert.throws(
    () => applyCommand(match, "stranger", command("heartbeat"), 1, new Set()),
    /member/,
  );
  assert.throws(
    () =>
      applyCommand(
        match,
        "a",
        command("board", { board: { "0,0": match.players.b.hand[0].id } }),
        1,
        new Set(),
      ),
    /unowned/,
  );
  const id = match.players.a.hand[0].id;
  assert.throws(
    () =>
      applyCommand(
        match,
        "a",
        command("board", { board: { "0,0": id, "0,1": id } }),
        1,
        new Set(),
      ),
    /duplicate/,
  );
  assert.throws(
    () => applyCommand(match, "a", command("finish"), 1, new Set()),
    /win requires/,
  );
});
test("exchange conserves tiles and replay cannot draw again; stale sequence rejected", () => {
  const initial = createMatch("match", "seed", [profile("a"), profile("b")], 0);
  const action = command("exchange", { tileId: initial.players.a.hand[0].id });
  const first = applyCommand(initial, "a", action, 1, new Set()).match;
  assert.equal(first.pool.length, 41);
  assert.equal(first.players.a.hand.length, 16);
  assert.equal(
    new Set(
      [...first.pool, ...first.players.a.hand, ...first.players.b.hand].map(
        (t) => t.id,
      ),
    ).size,
    72,
  );
  assert.equal(applyCommand(first, "a", action, 2, new Set()).duplicate, true);
  assert.throws(
    () =>
      applyCommand(
        first,
        "b",
        command("exchange", {
          commandId: "different-0001",
          tileId: first.players.b.hand[0].id,
        }),
        3,
        new Set(),
      ),
    /State changed/,
  );
});
test("validated shared peel delivers exactly one tile to each player and reconciles sequence", () => {
  const match = createMatch("match", "seed", [profile("a"), profile("b")], 0);
  const word = match.players.a.hand.map((t) => t.letter).join("");
  const board = Object.fromEntries(
    match.players.a.hand.map((t, i) => [`0,${i}`, t.id]),
  );
  const next = applyCommand(
    match,
    "a",
    command("peel", { board }),
    1,
    new Set([word]),
  ).match;
  assert.equal(next.players.a.hand.length, 1);
  assert.equal(next.players.b.hand.length, 16);
  assert.equal(next.pool.length, 40);
  assert.equal(next.public.sequence, 1);
  assert.equal(next.players.a.sequence, next.players.b.sequence);
  assert.throws(
    () => applyCommand(match, "a", command("peel", { board }), 1, new Set()),
    /valid words/,
  );
});
test("valid final board wins only with exhausted shared pool", () => {
  const match = createMatch("match", "seed", [profile("a"), profile("b")], 0);
  match.players.b.hand.push(...match.pool);
  match.pool = [];
  match.public.poolCount = 0;
  const word = match.players.a.hand.map((t) => t.letter).join("");
  const board = Object.fromEntries(
    match.players.a.hand.map((t, i) => [`0,${i}`, t.id]),
  );
  const result = applyCommand(
    match,
    "a",
    command("finish", { board }),
    1,
    new Set([word]),
  );
  assert.equal(result.winnerId, "a");
  assert.equal(result.reason, "finish");
});
test("forfeit and disconnect are server outcomes, two expired leases abandon", () => {
  const match = createMatch("match", "seed", [profile("a"), profile("b")], 0);
  assert.equal(
    applyCommand(match, "a", command("forfeit"), 1, new Set()).winnerId,
    "b",
  );
  match.public.lastSeen.a = 110000;
  assert.equal(
    applyCommand(match, "a", command("heartbeat"), 120000, new Set()).reason,
    "disconnect",
  );
  match.public.lastSeen.a = 0;
  assert.equal(
    applyCommand(match, "a", command("heartbeat"), 120000, new Set()).reason,
    "abandoned",
  );
});

test("independent board edits accept stale sequence and converge", () => {
  const match = createMatch("match", "seed", [profile("a"), profile("b")], 0);
  const a = command("board", {
    commandId: "board-a-0001",
    board: { "0,0": match.players.a.hand[0].id },
  });
  const b = command("board", {
    commandId: "board-b-0001",
    board: { "0,0": match.players.b.hand[0].id },
  });
  const ab = applyCommand(
    applyCommand(match, "a", a, 1, new Set()).match,
    "b",
    b,
    1,
    new Set(),
  ).match;
  const ba = applyCommand(
    applyCommand(match, "b", b, 1, new Set()).match,
    "a",
    a,
    1,
    new Set(),
  ).match;
  assert.deepEqual(ab.players, ba.players);
  assert.equal(ab.public.sequence, 2);
});
test("stale board edit after an opponent peel keeps newly owned draw in hand", () => {
  const match = createMatch("match", "seed", [profile("a"), profile("b")], 0);
  const word = match.players.a.hand.map((tile) => tile.letter).join("");
  const board = Object.fromEntries(
    match.players.a.hand.map((tile, i) => [`0,${i}`, tile.id]),
  );
  const stale = command("board", {
    commandId: "board-b-stale",
    board: { "2,2": match.players.b.hand[0].id },
  });
  const peeled = applyCommand(
    match,
    "a",
    command("peel", { board }),
    1,
    new Set([word]),
  ).match;
  const drawn = peeled.players.b.hand[15];
  const edited = applyCommand(peeled, "b", stale, 2, new Set()).match;
  assert.equal(edited.public.sequence, 2);
  assert.equal(edited.players.b.hand.length, 15);
  assert.ok(edited.players.b.hand.some((tile) => tile.id === drawn.id));
  assert.equal(edited.players.b.board["2,2"].id, match.players.b.hand[0].id);
});

test("evicted board command cannot replay after more than 128 mutations", () => {
  let match = createMatch("match", "seed", [profile("a"), profile("b")], 0);
  const tile = match.players.a.hand[0];
  const first = command("board", {
    commandId: "old-board-0001",
    board: { "0,0": tile.id },
  });
  match = applyCommand(match, "a", first, 1, new Set()).match;
  for (let i = 1; i <= 128; i++) {
    match = applyCommand(
      match,
      "a",
      command("board", {
        commandId: `later-board-${i}`,
        expectedSequence: match.public.sequence,
        board: { "1,1": tile.id },
      }),
      i + 1,
      new Set(),
    ).match;
  }
  assert.equal(match.public.sequence, 129);
  assert.equal(match.processed.length, 128);
  assert.equal(match.processed.includes("a:old-board-0001"), false);
  assert.throws(
    () => applyCommand(match, "a", first, 131, new Set()),
    /outside the replay window/,
  );
  assert.equal(match.players.a.board["1,1"].id, tile.id);
  for (const expectedSequence of [-1, 130, Infinity, NaN, 1.5]) {
    assert.throws(
      () =>
        applyCommand(
          match,
          "a",
          command("board", { commandId: "invalid-sequence", expectedSequence }),
          132,
          new Set(),
        ),
      /outside the replay window/,
    );
  }
});
test("hundreds of heartbeats preserve mutation replay protection and only refresh presence", () => {
  let match = createMatch("match", "seed", [profile("a"), profile("b")], 0);
  const tile = match.players.a.hand[0];
  const first = command("board", {
    commandId: "old-board-0001",
    board: { "0,0": tile.id },
  });
  match = applyCommand(match, "a", first, 1, new Set()).match;
  match = applyCommand(
    match,
    "a",
    command("board", {
      commandId: "new-board-0002",
      expectedSequence: 1,
      board: { "1,1": tile.id },
    }),
    2,
    new Set(),
  ).match;
  for (let i = 0; i < 512; i++) {
    match = applyCommand(
      match,
      "a",
      command("heartbeat", { commandId: `heartbeat-${i}` }),
      i + 3,
      new Set(),
    ).match;
  }
  assert.equal(match.public.sequence, 2);
  assert.deepEqual(match.processed, ["a:old-board-0001", "a:new-board-0002"]);
  const replay = applyCommand(match, "a", first, 515, new Set());
  assert.equal(replay.duplicate, true);
  assert.equal(replay.match.players.a.board["1,1"].id, tile.id);
  const heartbeat = command("heartbeat", { commandId: "repeated-heartbeat" });
  const once = applyCommand(match, "a", heartbeat, 516, new Set()).match;
  const twice = applyCommand(once, "a", heartbeat, 517, new Set()).match;
  assert.equal(twice.public.lastSeen.a, 517);
  assert.deepEqual(twice.players, once.players);
  assert.deepEqual(twice.processed, once.processed);
});

test("legacy heartbeat-filled replay caches migrate without reopening old board commands", () => {
  let match = createMatch("match", "seed", [profile("a"), profile("b")], 0);
  const tile = match.players.a.hand[0];
  const old = command("board", {
    commandId: "legacy-board-001",
    board: { "0,0": tile.id },
  });
  match = applyCommand(match, "a", old, 1, new Set()).match;
  delete match.replayFloor;
  match.processed.push(
    ...Array.from({ length: 127 }, (_, i) => `a:legacy-heartbeat-${i}`),
  );
  match = applyCommand(
    match,
    "a",
    command("board", {
      commandId: "current-board-002",
      expectedSequence: 1,
      board: { "1,1": tile.id },
    }),
    2,
    new Set(),
  ).match;
  assert.equal(match.replayFloor, 1);
  assert.deepEqual(match.processed, ["a:current-board-002"]);
  assert.throws(
    () => applyCommand(match, "a", old, 3, new Set()),
    /outside the replay window/,
  );
});

test("Apple erasure exchanges a code, checks its owner, and revokes the grant", async () => {
  const { generateKeyPairSync } = await import("node:crypto");
  const { revokeAppleAuthorization } = await import(
    "../../functions/src/apple"
  );
  const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const config = {
    teamId: "test-team",
    keyId: "test-key",
    clientId: "test-app",
    privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  };
  const calls: string[] = [];
  const idToken = `header.${Buffer.from(JSON.stringify({ sub: "apple-owner", aud: "test-app" })).toString("base64url")}.signature`;
  const request: typeof fetch = async (url, init) => {
    calls.push(String(url));
    const body = init?.body as URLSearchParams;
    assert.equal(body.get("client_id"), "test-app");
    if (String(url).endsWith("/token")) {
      assert.equal(body.get("code"), "test-code");
      return new Response(
        JSON.stringify({ id_token: idToken, refresh_token: "test-refresh" }),
        { status: 200 },
      );
    }
    assert.equal(body.get("token"), "test-refresh");
    assert.equal(body.get("token_type_hint"), "refresh_token");
    return new Response(null, { status: 200 });
  };
  await revokeAppleAuthorization("test-code", "apple-owner", config, request);
  assert.deepEqual(calls, [
    "https://appleid.apple.com/auth/token",
    "https://appleid.apple.com/auth/revoke",
  ]);
  calls.length = 0;
  await assert.rejects(
    revokeAppleAuthorization("test-code", "different-owner", config, request),
  );
  assert.equal(calls.length, 1);
  await assert.rejects(
    revokeAppleAuthorization(
      "test-code",
      "apple-owner",
      config,
      async () => new Response(null, { status: 400 }),
    ),
  );
});
