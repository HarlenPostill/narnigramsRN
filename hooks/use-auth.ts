import { supabase } from "@/lib/supabase";
import type { PlayerRecord } from "@/lib/player-service";
import { getOrCreatePlayer } from "@/lib/player-service";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import { createElement } from "react";

interface AuthState {
  isLoading: boolean;
  player: PlayerRecord | null;
  needsUsername: boolean;
  setNeedsUsername: (v: boolean) => void;
  refreshPlayer: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  isLoading: true,
  player: null,
  needsUsername: false,
  setNeedsUsername: () => {},
  refreshPlayer: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [player, setPlayer] = useState<PlayerRecord | null>(null);
  const [needsUsername, setNeedsUsername] = useState(false);

  const initAuth = useCallback(async () => {
    try {
      // Check for existing session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      let userId: string;

      if (session?.user) {
        userId = session.user.id;
      } else {
        // Sign in anonymously
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
        userId = data.user!.id;
      }

      // Get or create player record
      const playerRecord = await getOrCreatePlayer(userId);
      setPlayer(playerRecord);

      // Check if username looks auto-generated
      if (playerRecord.username.startsWith("Player")) {
        setNeedsUsername(true);
      }
    } catch (err) {
      console.warn("Auth init failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshPlayer = useCallback(async () => {
    if (!player) return;
    try {
      const { data } = await supabase
        .from("players")
        .select("*")
        .eq("id", player.id)
        .single();
      if (data) setPlayer(data as PlayerRecord);
    } catch (err) {
      console.warn("Failed to refresh player:", err);
    }
  }, [player]);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return createElement(
    AuthContext.Provider,
    {
      value: { isLoading, player, needsUsername, setNeedsUsername, refreshPlayer },
    },
    children,
  );
}
