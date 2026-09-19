import type { MatchSession, QueueTicket } from '../shared/online';
import type { Tile } from '../types/game';

/** A rejected command is safe to discard; an unknown outcome must retain its ID. */
export function commandOutcomeUnknown(error: unknown): boolean {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code).replace(/^functions\//, '') : '';
  return !['invalid-argument', 'failed-precondition', 'permission-denied', 'unauthenticated', 'not-found', 'resource-exhausted'].includes(code);
}

export function canReconcileSession(current: MatchSession | null, incoming: MatchSession, matchId: string): boolean {
  return incoming.match.id === matchId && incoming.match.sequence === incoming.player.sequence && (!current || current.match.id !== matchId || incoming.match.sequence >= current.match.sequence);
}

/** Returning a board tile and exchanging it are one authoritative command. */
export function boardBeforeExchange(board: Record<string, Tile>, tileId: string): Record<string, Tile> {
  return Object.fromEntries(Object.entries(board).filter(([, tile]) => tile.id !== tileId));
}

/** Only listener snapshots are filtered: a direct enqueue may resume an older active match. */
export function isCurrentSearchSnapshot(ticket: QueueTicket | null, searchId: string): ticket is QueueTicket {
  return ticket !== null && ticket.searchId === searchId;
}
