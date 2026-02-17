import { useCallback, useRef, useSyncExternalStore } from "react";
import { storage } from "@/utils/storage";

export function useStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T) => void] {
  const cachedRaw = useRef<string | null>(null);
  const cachedValue = useRef<T>(defaultValue);

  const getSnapshot = useCallback(() => {
    const raw = localStorage.getItem(key);
    if (raw !== cachedRaw.current) {
      cachedRaw.current = raw;
      cachedValue.current = raw ? JSON.parse(raw) : defaultValue;
    }
    return cachedValue.current;
  }, [key, defaultValue]);

  const value = useSyncExternalStore(
    (cb) => storage.subscribe(key, cb),
    getSnapshot
  );

  const setValue = useCallback(
    (newValue: T) => storage.set(key, newValue),
    [key]
  );

  return [value, setValue];
}
