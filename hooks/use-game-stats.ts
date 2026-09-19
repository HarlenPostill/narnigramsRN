import { useAuth } from "./use-auth";
import { useStorage } from "./use-storage";
import { EMPTY_STATS, type GameStats } from "@/types/game";
import { statsKey } from "@/utils/stats-manager";
export function useGameStats() {
  const { uid } = useAuth();
  return useStorage<GameStats>(statsKey(uid), EMPTY_STATS)[0];
}
