import { getRepositories } from '@/lib/repositories';
import type { MatchCommand, MatchSession } from '@/shared/online';
import { ONLINE_PROTOCOL, RECONNECT_GRACE_MS } from '@/shared/online';
import { DEFAULT_SETTINGS, type GameState, type Tile } from '@/types/game';
import { validateBoard } from '@/utils/game-engine';
import { boardBeforeExchange, canReconcileSession, commandOutcomeUnknown } from '@/utils/online-reconciliation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

export function useOnlineGame(matchId: string) {
  const [session, setSession] = useState<MatchSession | null>(null);
  const [board, setBoard] = useState<Record<string, Tile>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const latest = useRef<MatchSession | null>(null);
  const busy = useRef(false);
  const heartbeatBusy = useRef(false);
  const generation = useRef(0);
  const activeMatch = useRef(matchId);
  const optimistic = useRef(false);
  const heartbeatError = useRef(false);
  const mounted = useRef(true);
  const failed = useRef<MatchCommand | null>(null);
  const reconcile = useCallback((incoming: MatchSession) => {
    if (!mounted.current || !canReconcileSession(latest.current, incoming, activeMatch.current)) return;
    if (incoming.match.protocol !== ONLINE_PROTOCOL) { setError('This match requires a newer app version.'); return; }
    latest.current = incoming; setSession(incoming);
    if (heartbeatError.current && !failed.current) { heartbeatError.current = false; setError(null); }
    if (!optimistic.current) setBoard(incoming.player.board);
  }, []);
  useEffect(() => {
    activeMatch.current = matchId;
    const currentGeneration = generation.current + 1;
    generation.current = currentGeneration;
    latest.current = null; failed.current = null; busy.current = false; heartbeatBusy.current = false; optimistic.current = false; heartbeatError.current = false;
    setSession(null); setBoard({}); setPending(false); setError(null);
    return () => { generation.current = currentGeneration + 1; };
  }, [matchId]);
  useEffect(() => {
    mounted.current = true;
    try {
      const unsubscribe = getRepositories().matches.watch(matchId, reconcile, e => setError(e.message));
      return () => { mounted.current = false; unsubscribe(); };
    } catch (e) { setError(e instanceof Error ? e.message : 'Online services unavailable'); return () => { mounted.current = false; }; }
  }, [matchId, reconcile, attempt]);
  const send = useCallback(async (type: MatchCommand['type'], nextBoard?: Record<string, Tile>, tileId?: string, retryCommand?: MatchCommand) => {
    const current = latest.current;
    const heartbeat = type === 'heartbeat';
    if (!current || current.match.id !== matchId || current.match.status !== 'active' || (heartbeat ? heartbeatBusy.current : busy.current)) return;
    if (!heartbeat && failed.current && !retryCommand && type !== 'forfeit') return;
    const requestGeneration = generation.current;
    if (heartbeat) heartbeatBusy.current = true;
    else { busy.current = true; optimistic.current = !!nextBoard; setPending(true); }
    const command: MatchCommand = retryCommand ?? {
      matchId, type, commandId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      expectedSequence: current.match.sequence,
      ...(nextBoard ? { board: Object.fromEntries(Object.entries(nextBoard).map(([key, tile]) => [key, tile.id])) } : {}),
      ...(tileId ? { tileId } : {}),
    };
    try {
      const result = await getRepositories().matches.command(command);
      if (requestGeneration !== generation.current || !mounted.current) return;
      if (!heartbeat) { optimistic.current = false; failed.current = null; heartbeatError.current = false; setError(null); }
      reconcile(result);
      if (!heartbeat) setBoard(latest.current?.player.board ?? {});
    } catch (e) {
      if (requestGeneration !== generation.current || !mounted.current) return;
      if (!heartbeat) {
        failed.current = commandOutcomeUnknown(e) ? command : null;
        heartbeatError.current = false;
        optimistic.current = false;
        setBoard(latest.current?.player.board ?? {});
        setError(e instanceof Error ? e.message : 'Connection lost. Retry to reconnect.');
      } else if (!failed.current && !busy.current) { heartbeatError.current = true; setError('Connection interrupted. Reconnecting…'); }
    } finally {
      if (requestGeneration === generation.current) {
        if (heartbeat) heartbeatBusy.current = false;
        else { busy.current = false; if (mounted.current) setPending(false); }
      }
    }
  }, [matchId, reconcile]);
  useEffect(() => {
    const pulse = () => { if (AppState.currentState === 'active' || AppState.currentState == null) void send('heartbeat'); };
    const interval = setInterval(pulse, 20_000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') pulse(); });
    return () => { clearInterval(interval); subscription.remove(); };
  }, [send]);
  useEffect(() => {
    // Announce a restored session immediately, rather than waiting up to 20s near the lease deadline.
    if (session?.match.id && session.match.status === 'active') void send('heartbeat');
  }, [session?.match.id, session?.match.status, send]);
  const owned = session ? [...session.player.hand, ...Object.values(session.player.board)] : [];
  const onBoard = new Set(Object.values(board).map(tile => tile.id));
  const hand = owned.filter(tile => !onBoard.has(tile.id));
  const edit = useCallback((tileId: string, row?: number, col?: number) => {
    if (busy.current || failed.current || !latest.current || latest.current.match.status !== 'active') return;
    const current = latest.current.player;
    const tile = [...current.hand, ...Object.values(current.board)].find(t => t.id === tileId);
    if (!tile) return;
    const next = { ...current.board };
    if (row !== undefined && col !== undefined) {
      if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || col < 0 || row >= 40 || col >= 40 || next[`${row},${col}`]) return;
    }
    for (const key of Object.keys(next)) if (next[key].id === tileId) delete next[key];
    if (row !== undefined && col !== undefined) next[`${row},${col}`] = tile;
    setBoard(next); void send('board', next);
  }, [send]);
  const placeTile = useCallback((id: string, row: number, col: number) => edit(id, row, col), [edit]);
  const returnTile = useCallback((id: string) => edit(id), [edit]);
  const exchangeTile = useCallback((id: string) => {
    const current = latest.current;
    if (current) void send('exchange', boardBeforeExchange(current.player.board, id), id);
  }, [send]);
  const peel = useCallback(() => { void send('peel', latest.current?.player.board); }, [send]);
  const onlineFinish = useCallback(() => { void send('finish', latest.current?.player.board); }, [send]);
  const onlineForfeit = useCallback(() => send('forfeit'), [send]);
  const retry = useCallback(() => {
    if (failed.current) void send(failed.current.type, undefined, undefined, failed.current);
    else { setError(null); setAttempt(value => value + 1); }
  }, [send]);
  const uid = getUid();
  const match = session?.match;
  const opponentId = match?.playerIds.find(id => id !== uid);
  const opponent = opponentId ? match?.players[opponentId] : undefined;
  const state: GameState = {
    hand, board, pool: [], startedAt: match?.createdAt ?? 0,
    elapsedMs: match ? Math.max(0, (match.result?.settledAt ?? Date.now()) - match.createdAt) : 0,
    settings: { ...DEFAULT_SETTINGS, gameMode: 'online', timerMode: 'none' },
    isComplete: !!match && match.status !== 'active', isWin: match?.result?.winnerId === uid,
  };
  return {
    state, canAct: !pending && !failed.current && hand.length === 0 && Object.keys(board).length > 1 && validateBoard(board),
    placeTile, moveTile: placeTile, returnTile, exchangeTile, peel,
    validateWords: () => true, // The authoritative command validates the exact board and dictionary.
    onlineFinish, onlineForfeit, pending: pending || failed.current !== null, error, retry,
    dictionaryReady: true, dictionaryError: null,
    poolCount: match?.poolCount ?? 0, opponent,
    opponentConnected: !!opponentId && Date.now() - (match?.lastSeen[opponentId] ?? 0) < RECONNECT_GRACE_MS,
    eloDelta: uid ? match?.result?.ratings[uid]?.delta : undefined,
    resultReason: match?.result?.reason,
  };
}
function getUid() { try { return getRepositories().auth.currentUid(); } catch { return null; } }
