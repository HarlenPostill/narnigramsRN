import { getRepositories, hasFirebaseConfiguration } from '@/lib/repositories';
import type { PlayerProfile } from '@/shared/online';
import { createContext, createElement, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

interface AuthState {
  isLoading: boolean;
  hasAccount: boolean;
  player: PlayerProfile | null;
  error: string | null;
  ensurePlayer: () => Promise<PlayerProfile>;
  refreshPlayer: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}
const AuthContext = createContext<AuthState | null>(null);
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider is missing');
  return context;
}
export function AuthProvider({ children }: { children: ReactNode }) {
  const [hasAccount, setHasAccount] = useState(false);
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Restores an existing identity; never creates an account until Ranked is opened.
  useEffect(() => {
    if (!hasFirebaseConfiguration()) return;
    let unsubscribeProfile: (() => void) | undefined;
    try {
      const repositories = getRepositories();
      const unsubscribe = repositories.auth.watchAuth(uid => {
        unsubscribeProfile?.();
        setHasAccount(uid !== null);
        if (uid) unsubscribeProfile = repositories.profiles.watch(setPlayer, e => setError(e.message));
        else setPlayer(null);
      });
      return () => { unsubscribe(); unsubscribeProfile?.(); };
    } catch (e) { setError(e instanceof Error ? e.message : 'Online services unavailable'); }
  }, []);
  const ensurePlayer = useCallback(async () => {
    setLoading(true); setError(null);
    try { const profile = await getRepositories().auth.ensurePlayer(); setPlayer(profile); return profile; }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to connect'); throw e; }
    finally { setLoading(false); }
  }, []);
  const refreshPlayer = useCallback(async () => {
    if (!hasFirebaseConfiguration()) return;
    try { setPlayer(await getRepositories().profiles.get()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to refresh rating'); }
  }, []);
  const deleteAccount = useCallback(async () => {
    await getRepositories().auth.deleteAccount(); setPlayer(null); setHasAccount(false);
  }, []);
  return createElement(AuthContext.Provider, { value: { player, hasAccount, isLoading, error, ensurePlayer, refreshPlayer, deleteAccount } }, children);
}
