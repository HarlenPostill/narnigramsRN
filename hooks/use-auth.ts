import {
  commandId,
  getRepositories,
  hasFirebaseConfiguration,
} from "@/lib/repositories";
import type { PlayerProfile } from "@/shared/online";
import { addRecord, emptyStats, legacyArchive } from "@/shared/stats";
import type { GameRecord, GameStats } from "@/types/game";
import { storage } from "@/utils/storage";
import { pendingKey, setStatsOwner, statsKey } from "@/utils/stats-manager";
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface AuthState {
  uid: string | null;
  isLoading: boolean;
  hasAccount: boolean;
  player: PlayerProfile | null;
  error: string | null;
  ensurePlayer: () => Promise<PlayerProfile>;
  refreshPlayer: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  signOut: () => Promise<void>;
}
const AuthContext = createContext<AuthState | null>(null);
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthProvider is missing");
  return context;
}
export function AuthProvider({ children }: { children: ReactNode }) {
  const [uid, setUid] = useState<string | null>(null);
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!hasFirebaseConfiguration()) {
      setLoading(false);
      return;
    }
    let disposeSession = () => {};
    try {
      const repositories = getRepositories();
      const stop = repositories.auth.watchAuth((id) => {
        disposeSession();
        setStatsOwner(id);
        setUid(id);
        setPlayer(
          id
            ? storage.get<PlayerProfile | null>(`player-cache-${id}`, null)
            : null,
        );
        setError(null);
        setLoading(false);
        if (!id) return;
        let disposed = false;
        let syncing = false;
        let remote = emptyStats();
        const key = pendingKey(id);
        // Claim the pre-account history once on this installation, including retries.
        if (!storage.get<string | null>("stats-migration-owner", null)) {
          const legacy = storage.get<GameStats>("game-stats", emptyStats());
          storage.set(key, [
            ...storage.get<GameRecord[]>(key, []),
            ...legacy.records.filter((r) => r.gameMode !== "online"),
          ]);
          storage.set(`stats-migration-${id}`, {
            id: commandId(),
            stats: legacyArchive(legacy),
          });
          storage.set("stats-migration-owner", id);
        }
        const display = () => {
          let combined = remote;
          for (const r of storage.get<GameRecord[]>(key, [])) {
            if (!combined.records.some((existing) => existing.id === r.id))
              combined = addRecord(combined, r);
          }
          storage.set(statsKey(id), combined);
        };
        const sync = async () => {
          if (syncing || disposed) return;
          syncing = true;
          try {
            await repositories.auth.ensurePlayer();
            if (disposed || repositories.auth.currentUid() !== id) return;
            const migration = storage.get<{
              id: string;
              stats: GameStats;
            } | null>(`stats-migration-${id}`, null);
            if (migration) {
              await repositories.stats.migrate(migration.id, migration.stats);
              if (disposed) return;
              storage.set(`stats-migration-${id}`, null);
            }
            while (!disposed && repositories.auth.currentUid() === id) {
              const batch = storage.get<GameRecord[]>(key, []).slice(0, 100);
              if (!batch.length) break;
              await repositories.stats.sync(batch);
              if (disposed) break;
              const sent = new Set(batch.map((r) => r.id));
              storage.set(
                key,
                storage
                  .get<GameRecord[]>(key, [])
                  .filter((r) => !sent.has(r.id)),
              );
            }
            if (!disposed) setError(null);
          } catch (e) {
            if (!disposed)
              setError(
                e instanceof Error
                  ? e.message
                  : "Stats will sync when you reconnect.",
              );
          } finally {
            syncing = false;
          }
        };
        const fail = (e: Error) => {
          if (!disposed) setError(e.message);
        };
        const stopProfile = repositories.profiles.watch((p) => {
          if (!disposed) {
            setPlayer(p);
            storage.set(`player-cache-${id}`, p);
          }
        }, fail);
        const stopStats = repositories.stats.watch((stats) => {
          if (!disposed) {
            remote = stats ?? emptyStats();
            display();
          }
        }, fail);
        const stopPending = storage.subscribe(key, () => {
          void sync();
        });
        const timer = setInterval(() => {
          void sync();
        }, 15000);
        void sync();
        disposeSession = () => {
          disposed = true;
          stopProfile();
          stopStats();
          stopPending();
          clearInterval(timer);
        };
      });
      return () => {
        stop();
        disposeSession();
        setStatsOwner(null);
      };
    } catch (e) {
      setError(e instanceof Error ? e.message : "Online services unavailable");
      setLoading(false);
    }
  }, []);
  const ensurePlayer = useCallback(async () => {
    const repositories = getRepositories();
    const profile = await repositories.auth.ensurePlayer();
    if (repositories.auth.currentUid() === profile.uid) {
      setPlayer(profile);
      setError(null);
      storage.set(`player-cache-${profile.uid}`, profile);
    }
    return profile;
  }, []);
  const refreshPlayer = useCallback(async () => {
    if (!hasFirebaseConfiguration()) return;
    try {
      const repositories = getRepositories();
      const id = repositories.auth.currentUid();
      const profile = await repositories.profiles.get();
      if (repositories.auth.currentUid() === id) setPlayer(profile);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to refresh rating");
    }
  }, []);
  const signOut = useCallback(async () => {
    await getRepositories().auth.signOut();
  }, []);
  const deleteAccount = useCallback(async () => {
    const id = getRepositories().auth.currentUid();
    await getRepositories().auth.deleteAccount();
    if (id) {
      storage.set(`player-cache-${id}`, null);
      storage.set(statsKey(id), emptyStats());
      storage.set(pendingKey(id), []);
      storage.set(`stats-migration-${id}`, null);
    }
  }, []);
  return createElement(
    AuthContext.Provider,
    {
      value: {
        uid,
        player,
        hasAccount: uid !== null,
        isLoading,
        error,
        ensurePlayer,
        refreshPlayer,
        deleteAccount,
        signOut,
      },
    },
    children,
  );
}
