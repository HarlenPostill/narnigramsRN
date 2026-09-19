import "./storage-install";
import { decodeStored, SAVE_VERSION } from "./storage-schema";
type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();
export const storage = {
  raw(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  get<T>(key: string, defaultValue: T): T {
    const value = decodeStored(key, storage.raw(key));
    return value === undefined ? defaultValue : value as T;
  },
  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(key === "current-game" && value ? { version: SAVE_VERSION, data: value } : value));
      listeners.get(key)?.forEach((fn) => fn());
    } catch { if (__DEV__) console.warn("Local save unavailable"); }
  },
  subscribe(key: string, listener: Listener): () => void {
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key)!.add(listener);
    return () => { listeners.get(key)?.delete(listener); };
  },
};
