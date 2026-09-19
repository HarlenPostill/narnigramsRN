import * as AppleAuthentication from "expo-apple-authentication";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { getRepositories } from "@/lib/repositories";

export function AccountGate({ onCancel }: { onCancel: () => void }) {
  const colors = useColors();
  const [create, setCreate] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  useEffect(() => {
    void AppleAuthentication.isAvailableAsync()
      .then(setAppleAvailable)
      .catch(() => {});
  }, []);
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      await action();
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (
        code !== "ERR_REQUEST_CANCELED" &&
        code !== "auth/popup-closed-by-user"
      )
        setMessage(
          code === "auth/invalid-credential"
            ? "Email or password is incorrect."
            : code === "auth/email-already-in-use"
              ? "An account already uses this email. Sign in or reset your password."
              : code === "auth/credential-already-in-use"
                ? "This Apple account already exists. Sign out in Settings, then sign in with Apple."
                : code === "auth/weak-password"
                  ? "Choose a password with at least 6 characters."
                  : e instanceof Error
                    ? e.message
                    : "Unable to sign in. Please retry.",
        );
    } finally {
      setBusy(false);
    }
  };
  const button = (label: string, action: () => void, secondary = false) => (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      onPress={action}
      style={[
        styles.button,
        secondary && styles.secondary,
        { opacity: busy ? 0.5 : 1 },
      ]}
    >
      <Text
        style={[styles.buttonText, secondary && { color: colors.textPrimary }]}
      >
        {label}
      </Text>
    </Pressable>
  );
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.screenBg }}
      contentContainerStyle={styles.screen}
    >
      <Text
        accessibilityRole="header"
        style={[styles.title, { color: colors.textPrimary }]}
      >
        {create ? "Create your account" : "Sign in for Ranked"}
      </Text>
      <Text style={{ color: colors.textSecondary }}>
        Keep your rating and stats across devices. Solo and Practice are always
        available without an account. Your saved game history will be added to
        your first account on this device.
      </Text>
      <View style={{ gap: 12 }}>
        <TextInput
          accessibilityLabel="Email"
          placeholder="Email"
          placeholderTextColor={colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          editable={!busy}
          style={[
            styles.input,
            { color: colors.textPrimary, borderColor: colors.textSecondary },
          ]}
        />
        <TextInput
          accessibilityLabel="Password"
          placeholder="Password"
          placeholderTextColor={colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete={create ? "new-password" : "current-password"}
          editable={!busy}
          style={[
            styles.input,
            { color: colors.textPrimary, borderColor: colors.textSecondary },
          ]}
        />
        {button(create ? "Create account" : "Sign in", () => {
          void run(async () => {
            if (!email.trim() || !password)
              throw new Error("Enter your email and password.");
            await getRepositories().auth.signIn(email, password, create);
          });
        })}
        {appleAvailable ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={
              AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
            }
            buttonStyle={
              AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={12}
            style={{ height: 50, opacity: busy ? 0.5 : 1 }}
            onPress={() => {
              void run(() => getRepositories().auth.signInApple());
            }}
          />
        ) : null}
        {Platform.OS === "web"
          ? button("Sign in with Apple", () => {
              void run(() => getRepositories().auth.signInApple());
            })
          : null}
        {button(
          create
            ? "Already have an account? Sign in"
            : "Create an account with email",
          () => {
            setCreate(!create);
            setMessage(null);
          },
          true,
        )}
        {button(
          "Forgot password?",
          () => {
            void run(async () => {
              if (!email.trim()) throw new Error("Enter your email first.");
              await getRepositories().auth.resetPassword(email);
              setMessage(
                "If an account uses this email, you’ll receive a password reset link.",
              );
            });
          },
          true,
        )}
      </View>
      {busy ? <ActivityIndicator accessibilityLabel="Signing in" /> : null}
      {message ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{ color: colors.textPrimary }}
        >
          {message}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={onCancel}
        style={[styles.button, styles.secondary]}
      >
        <Text style={[styles.buttonText, { color: colors.textSecondary }]}>
          Back to playing
        </Text>
      </Pressable>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 28,
    paddingVertical: 64,
    gap: 22,
  },
  secondary: { backgroundColor: "transparent" },
  title: { fontSize: 28, fontWeight: "700" },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 17,
  },
  button: {
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#0062FF",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
