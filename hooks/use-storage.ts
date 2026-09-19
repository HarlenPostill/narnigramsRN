import { useCallback, useRef, useSyncExternalStore } from "react";
import { storage } from "@/utils/storage";
export function useStorage<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const cache = useRef<{ key: string; raw: string | null; value: T } | null>(null);
  const getSnapshot = useCallback(() => {
    const raw = storage.raw(key);
    if (!cache.current || cache.current.key !== key || raw !== cache.current.raw) {
      cache.current = { key, raw, value: storage.get(key, defaultValue) };
    }
    return cache.current.value;
  }, [key, defaultValue]);
  const subscribe = useCallback((cb: () => void) => storage.subscribe(key, cb), [key]);
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const setValue = useCallback((newValue: T) => storage.set(key, newValue), [key]);
  return [value, setValue];
}
