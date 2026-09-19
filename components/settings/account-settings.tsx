import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { getRepositories } from "@/lib/repositories";
import { normalizeDisplayName } from "@/shared/profile";
import { onlineErrorMessage } from "@/utils/online-errors";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SettingsSection } from "./settings-section";

export function AccountSettings() {
  const { uid, hasAccount, isLoading, player, error, ensurePlayer, signOut } =
    useAuth();
  const colors = useColors();
  const { push } = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setName(player?.displayName ?? "");
  }, [uid, player?.displayName]);
  useEffect(() => {
    setMessage(null);
  }, [uid]);
  const account = hasAccount ? getRepositories().auth.accountInfo() : null;
  const run = async (
    label: string,
    work: () => Promise<unknown>,
    success: string,
  ) => {
    setBusy(label);
    setMessage(null);
    setFailed(false);
    try {
      await work();
      setMessage(success);
    } catch (e) {
      setFailed(true);
      setMessage(onlineErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };
  const button = (label: string, action: () => void, disabled = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy !== null }}
      disabled={disabled || busy !== null}
      onPress={action}
      style={[styles.button, { opacity: disabled || busy !== null ? 0.5 : 1 }]}
    >
      <Text
        style={{ color: colors.textPrimary, fontSize: 16, fontWeight: "600" }}
      >
        {busy === label ? "Please wait…" : label}
      </Text>
    </Pressable>
  );
  return (
    <SettingsSection
      title="Account"
      description="Your identity, public player name and online connection."
    >
      <Text style={[styles.heading, { color: colors.textPrimary }]}>
        {isLoading
          ? "Loading account…"
          : hasAccount
            ? "Signed in"
            : "Playing as a guest"}
      </Text>
      {!hasAccount ? (
        <>
          <Text style={{ color: colors.textSecondary }}>
            Sign in with Apple or email to play Ranked and sync your results.
            Solo and Practice are available without an account.
          </Text>
          {button(
            "Sign in or create an account",
            () => push("/account"),
            isLoading,
          )}
        </>
      ) : (
        <>
          <Text selectable style={{ color: colors.textPrimary }}>
            {account?.email ?? "No email shared"}
          </Text>
          <Text style={{ color: colors.textSecondary }}>
            Sign-in method:{" "}
            {account?.providers
              .map((p) =>
                p === "apple.com"
                  ? "Apple"
                  : p === "password"
                    ? "Email and password"
                    : p,
              )
              .join(", ") || "Unknown"}
          </Text>
          {account?.email?.endsWith("privaterelay.appleid.com") ? (
            <Text style={{ color: colors.textSecondary }}>
              Apple is keeping your personal email private with a relay address.
            </Text>
          ) : null}
          <Text selectable style={{ color: colors.textSecondary }}>
            Account ID: {uid}
          </Text>
          <View style={styles.group}>
            <Text style={{ color: colors.textPrimary, fontWeight: "600" }}>
              Public display name
            </Text>
            <TextInput
              accessibilityLabel="Public display name"
              value={name}
              onChangeText={(value) => {
                setName(value);
                setMessage(null);
              }}
              editable={!busy}
              placeholder="Choose a name"
              placeholderTextColor={colors.textSecondary}
              autoCorrect={false}
              style={[
                styles.input,
                {
                  color: colors.textPrimary,
                  borderColor: colors.textSecondary,
                },
              ]}
            />
            <Text style={{ color: colors.textSecondary }}>
              Use 1–30 characters. Names don’t need to be unique. Opponents see
              this name and your rating, never your email. Changes apply to new
              matches.
            </Text>
            {button(
              "Save display name",
              () =>
                void run(
                  "Save display name",
                  async () => {
                    if (!player) await ensurePlayer();
                    await getRepositories().profiles.update(name);
                  },
                  "Display name saved.",
                ),
              !normalizeDisplayName(name) ||
                normalizeDisplayName(name) === player?.displayName,
            )}
          </View>
          <Text style={{ color: colors.textPrimary }}>
            {player
              ? `Rating ${player.rating} · ${player.games} ranked games`
              : "Your online profile hasn’t loaded yet."}
          </Text>
          <Text
            accessibilityLiveRegion="polite"
            style={{ color: colors.textSecondary }}
          >
            {error
              ? "Online connection needs attention. Your account is signed in, but some data may not be synced."
              : player
                ? "Your profile is available. Signed-in results sync when connected."
                : "Check your connection to finish setting up your player."}
          </Text>
          {button(
            "Check connection",
            () =>
              void run(
                "Check connection",
                async () => {
                  await ensurePlayer();
                },
                "Connected. Your player profile is ready.",
              ),
          )}
          {account?.providers.includes("password") && account.email
            ? button(
                "Send password reset email",
                () =>
                  void run(
                    "Send password reset email",
                    () => getRepositories().auth.resetPassword(account.email!),
                    "Password reset email sent.",
                  ),
              )
            : null}
          {button(
            "Sign out",
            () => void run("Sign out", signOut, "Signed out."),
          )}
        </>
      )}
      {message ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{ color: failed ? "#D32F2F" : colors.textPrimary }}
        >
          {message}
        </Text>
      ) : null}
    </SettingsSection>
  );
}
const styles = StyleSheet.create({
  heading: { fontSize: 22, fontWeight: "700" },
  group: { gap: 10, paddingVertical: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    minHeight: 48,
    fontSize: 17,
  },
  button: { minHeight: 48, justifyContent: "center", paddingVertical: 12 },
});
