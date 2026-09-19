import { onlineErrorMessage } from "@/utils/online-errors";
import { AccountGate } from "@/components/auth/account-gate";
import { isCurrentSearchSnapshot } from "@/utils/online-reconciliation";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { commandId, getRepositories } from "@/lib/repositories";
import type { QueueTicket } from "@/shared/online";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function QueueScreen() {
  const { replace, back: goBack, canGoBack } = useRouter();
  const back = useCallback(() => {
    if (canGoBack()) goBack();
    else replace("/");
  }, [goBack, canGoBack, replace]);
  const { ensurePlayer, hasAccount, isLoading, player } = useAuth();
  const colors = useColors();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [cancelling, setCancelling] = useState(false);
  const resolved = useRef(false);
  const leaving = useRef(false);
  const searchId = useRef(commandId()).current;
  useEffect(() => {
    if (!hasAccount || isLoading) return;
    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    let busy = false;
    const start = Date.now();
    resolved.current = false;
    setError(null);
    setElapsed(0);
    const accept = (ticket: QueueTicket | null) => {
      if (!ticket || disposed || resolved.current || leaving.current) return;
      if (ticket.status === "matched" && ticket.matchId) {
        resolved.current = true;
        replace({ pathname: "/game", params: { matchId: ticket.matchId } });
      } else if (
        ticket.status === "fallback" &&
        ticket.seed &&
        ticket.botDifficulty
      ) {
        resolved.current = true;
        replace({
          pathname: "/game",
          params: {
            fallback: "true",
            seed: ticket.seed,
            botDifficulty: ticket.botDifficulty,
          },
        });
      } else if (ticket.status === "cancelled") {
        resolved.current = true;
        back();
      }
    };
    const fail = (e: unknown) => {
      if (disposed || leaving.current || resolved.current) return;
      if (timer) clearInterval(timer);
      unsubscribe?.();
      setError(onlineErrorMessage(e));
    };
    void (async () => {
      try {
        await ensurePlayer();
        if (disposed || leaving.current) return;
        const repository = getRepositories().matchmaking;
        const ticket = await repository.enqueue(searchId);
        if (disposed || leaving.current) return;
        accept(ticket);
        if (resolved.current) return;
        unsubscribe = repository.watch((snapshot) => {
          if (isCurrentSearchSnapshot(snapshot, searchId)) accept(snapshot);
        }, fail);
        timer = setInterval(() => {
          if (disposed || resolved.current || leaving.current || busy) return;
          setElapsed(Math.floor((Date.now() - start) / 1000));
          busy = true;
          void repository
            .poll(searchId)
            .then(accept)
            .catch(fail)
            .finally(() => {
              busy = false;
            });
        }, 1000);
      } catch (e) {
        fail(e);
      }
    })();
    return () => {
      disposed = true;
      unsubscribe?.();
      if (timer) clearInterval(timer);
    };
  }, [attempt, ensurePlayer, replace, back, searchId, hasAccount, isLoading]);
  useEffect(
    () => () => {
      if (hasAccount && !resolved.current) {
        try {
          void getRepositories()
            .matchmaking.cancel(searchId)
            .catch(() => {});
        } catch {
          /* No configured backend. */
        }
      }
    },
    [searchId, hasAccount],
  );
  const cancel = async () => {
    if (leaving.current) return;
    leaving.current = true;
    setCancelling(true);
    // Stop accepting queue events immediately. A failed connection must never
    // trap the player here; the server lease expires if cancellation cannot arrive.
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const ticket = await Promise.race([
        getRepositories().matchmaking.cancel(searchId),
        new Promise<null>((resolve) => {
          timeout = setTimeout(() => resolve(null), 2000);
        }),
      ]);
      if (ticket?.status === "matched" && ticket.matchId) {
        resolved.current = true;
        replace({ pathname: "/game", params: { matchId: ticket.matchId } });
      } else back();
    } catch {
      back();
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  };
  if (isLoading)
    return (
      <View style={styles.screen}>
        <ActivityIndicator />
      </View>
    );
  if (!hasAccount) return <AccountGate onCancel={back} />;
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.screen}
      style={{ flex: 1, backgroundColor: colors.screenBg }}
    >
      {!error && <ActivityIndicator size="large" />}
      <Text
        accessibilityRole="header"
        style={[styles.title, { color: colors.textPrimary }]}
      >
        {error
          ? attempt > 0
            ? "Still unable to connect"
            : "Unable to connect"
          : attempt > 0
            ? "Reconnecting…"
            : "Finding a human opponent"}
      </Text>
      <Text
        accessibilityLiveRegion="polite"
        style={{ color: colors.textSecondary, textAlign: "center" }}
      >
        {error ??
          `${elapsed}s · ${player?.displayName ?? "Your player"} · Searching by rating`}
      </Text>
      {!error ? (
        <Text style={{ color: colors.textSecondary, textAlign: "center" }}>
          After 10 seconds of searching, you’ll play an AI practice match if no
          human is available. AI matches do not affect your rating.
        </Text>
      ) : attempt > 0 ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{ color: colors.textSecondary }}
        >
          Retry {attempt} failed. You can try again or leave.
        </Text>
      ) : null}
      <Text style={{ color: colors.textSecondary, textAlign: "center" }}>
        Your rating and ranked results are saved to your account. Manage your
        account in Settings.
      </Text>
      {error !== null && (
        <Pressable
          accessibilityRole="button"
          style={styles.button}
          disabled={cancelling}
          onPress={() => setAttempt((x) => x + 1)}
        >
          <Text style={styles.buttonText}>Retry</Text>
        </Pressable>
      )}
      {error ? (
        <Pressable
          accessibilityRole="button"
          disabled={cancelling}
          style={styles.button}
          onPress={() => replace("/(settings)")}
        >
          <Text style={styles.buttonText}>Account settings</Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        disabled={cancelling}
        style={styles.button}
        onPress={() => {
          void cancel();
        }}
      >
        <Text style={styles.buttonText}>
          {cancelling ? "Leaving…" : error ? "Back to Play" : "Cancel search"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 28,
    gap: 22,
  },
  title: { fontSize: 24, fontWeight: "700", textAlign: "center" },
  button: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 32,
    borderRadius: 14,
    borderCurve: "continuous",
    backgroundColor: "#0062FF",
  },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "600" },
});
