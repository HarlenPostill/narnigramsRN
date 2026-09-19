import { useConfirm } from "@/components/ui/use-confirm";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import securityNotice from "@/assets/security-notice.json";
import wordlistNotice from "@/assets/wordlist-notice.json";
import { useState } from "react";
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SettingsSection } from "./settings-section";

export function PrivacySettings() {
  const { hasAccount, deleteAccount } = useAuth();
  const colors = useColors();
  const { confirm, dialog } = useConfirm();
  const [notice, setNotice] = useState<"privacy" | "dictionary" | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const privacyUrl = process.env.EXPO_PUBLIC_PRIVACY_URL;
  const supportUrl = process.env.EXPO_PUBLIC_SUPPORT_URL;
  const open = async (url: string) => {
    try {
      if (!/^https:\/\//.test(url))
        throw new Error("A secure HTTPS URL is required.");
      await Linking.openURL(url);
    } catch {
      setError("Unable to open this link. Please try again.");
    }
  };
  const erase = async () => {
    setDeleting(true);
    setError(null);
    try {
      await deleteAccount();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Deletion failed. Please retry.",
      );
    } finally {
      setDeleting(false);
    }
  };
  const confirmDelete = () => {
    const message =
      "Delete your account, profile and online data? An active ranked match will be forfeited. This cannot be undone. Account-linked stats will be erased. Guest Solo and Practice saves remain on this device.";
    confirm(
      "Delete account and online data?",
      message,
      () => {
        void erase();
      },
      "Delete",
    );
  };
  const button = (label: string, action: () => void) => (
    <Pressable
      accessibilityRole="button"
      style={styles.button}
      onPress={action}
    >
      <Text style={{ color: "#007AFF", fontSize: 16 }}>{label}</Text>
    </Pressable>
  );
  return (
    <SettingsSection
      title="Privacy and support"
      description="Solo and Practice work without an account. Ranked requires an Apple or email account. Your rating and stats follow your account."
    >
      {button("Privacy and data use", () => setNotice("privacy"))}
      {privacyUrl
        ? button("Published privacy policy", () => {
            void open(privacyUrl);
          })
        : null}
      {supportUrl ? (
        button("Contact support", () => {
          void open(supportUrl);
        })
      ) : (
        <Text style={{ color: colors.textSecondary }}>
          Support contact must be configured before release.
        </Text>
      )}
      {button("Dictionary and third-party notices", () =>
        setNotice("dictionary"),
      )}
      {hasAccount ? (
        <Pressable
          accessibilityRole="button"
          disabled={deleting}
          style={styles.button}
          onPress={confirmDelete}
        >
          <Text style={{ color: "#D32F2F", fontSize: 16 }}>
            {deleting ? "Deleting…" : "Delete account and online data"}
          </Text>
        </Pressable>
      ) : null}
      {error ? (
        <Text accessibilityLiveRegion="polite" style={{ color: "#D32F2F" }}>
          {error}
        </Text>
      ) : null}
      <Modal
        visible={notice !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setNotice(null)}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[
            styles.notice,
            { backgroundColor: colors.screenBg },
          ]}
        >
          <View>{button("Done", () => setNotice(null))}</View>
          <Text
            accessibilityRole="header"
            style={{
              color: colors.textPrimary,
              fontSize: 24,
              fontWeight: "700",
            }}
          >
            {notice === "dictionary" ? "Dictionary notices" : "Your data"}
          </Text>
          <Text
            selectable
            style={{ color: colors.textPrimary, fontSize: 16, lineHeight: 24 }}
          >
            {notice === "dictionary"
              ? `${wordlistNotice.name}\n\n${wordlistNotice.license}\n\nSecurity dependency notice\n${securityNotice.license}`
              : "Solo and Practice save games, settings and results on this device. Ranked requires signing in with Apple or email and password. Signed-in Solo and Practice results sync to your account; guest play stays on this device. Your first sign-in imports saved game history. We store a display name, rating, match results and temporary game state to provide matchmaking, reconnect and fair results. Other players can see your display name and rating during a match, but cannot see your private hand or board.\n\nWe do not include advertising, tracking, chat or analytics. Firebase processes online service data. You can delete your account and online data here. AI fallback matches are clearly identified and never affect public rating.\n\nAccount deletion is permanent. Email accounts support password reset; Apple accounts use Sign in with Apple."}
          </Text>
        </ScrollView>
      </Modal>
      {dialog}
    </SettingsSection>
  );
}
const styles = StyleSheet.create({
  button: { minHeight: 48, justifyContent: "center", paddingVertical: 12 },
  notice: { padding: 24, paddingTop: 48, gap: 20, flexGrow: 1 },
});
