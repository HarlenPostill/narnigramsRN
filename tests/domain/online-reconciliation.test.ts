import assert from 'node:assert/strict';
import test from 'node:test';
import type { MatchSession, QueueTicket } from '../../shared/online';
import { boardBeforeExchange, canReconcileSession, commandOutcomeUnknown, isCurrentSearchSnapshot } from '../../utils/online-reconciliation';

function session(id: string, sequence: number, privateSequence = sequence): MatchSession {
  return { match: { id, sequence }, player: { sequence: privateSequence } } as MatchSession;
}

test('transport uncertainty retains command identity, but sequence/validation rejection is not retried forever', () => {
  for (const code of ['unavailable', 'deadline-exceeded', 'internal']) assert.equal(commandOutcomeUnknown({ code: `functions/${code}` }), true);
  assert.equal(commandOutcomeUnknown(new Error('connection reset')), true);
  for (const code of ['failed-precondition', 'invalid-argument', 'permission-denied', 'unauthenticated', 'not-found', 'resource-exhausted']) assert.equal(commandOutcomeUnknown({ code: `functions/${code}` }), false);
});

test('reconciliation ignores delayed previous-match and older snapshots, accepts equal-sequence presence updates', () => {
  const current = session('current', 4);
  assert.equal(canReconcileSession(current, session('previous', 99), 'current'), false);
  assert.equal(canReconcileSession(current, session('current', 3), 'current'), false);
  assert.equal(canReconcileSession(current, session('current', 5, 4), 'current'), false);
  assert.equal(canReconcileSession(current, session('current', 4), 'current'), true);
  assert.equal(canReconcileSession(current, session('current', 5), 'current'), true);
});

test('exchanging from board returns that tile into the submitted hand without changing other placements', () => {
  const board = { '3,4': { id: 'a', letter: 'A' as const, points: 1 }, '3,5': { id: 'b', letter: 'B' as const, points: 1 } };
  assert.deepEqual(boardBeforeExchange(board, 'a'), { '3,5': board['3,5'] });
  assert.deepEqual(boardBeforeExchange(board, 'hand-tile'), board);
  assert.equal(Object.keys(board).length, 2);
});

test('a new search ignores cached fallback, cancelled and matched snapshots from the prior search', () => {
  for (const status of ['fallback', 'cancelled', 'matched', 'searching'] as const) {
    const cached = { searchId: 'previous-search', status } as QueueTicket;
    assert.equal(isCurrentSearchSnapshot(cached, 'new-search'), false);
  }
  assert.equal(isCurrentSearchSnapshot(null, 'new-search'), false);
  assert.equal(isCurrentSearchSnapshot({ status: 'fallback' } as QueueTicket, 'new-search'), false);
});

test('listener accepts each authoritative state for exactly its current search', () => {
  for (const status of ['searching', 'matched', 'fallback', 'cancelled'] as const) {
    assert.equal(isCurrentSearchSnapshot({ searchId: 'new-search', status } as QueueTicket, 'new-search'), true);
  }
});
