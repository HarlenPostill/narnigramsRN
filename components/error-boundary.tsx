import type { ErrorBoundaryProps } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
export function AppErrorBoundary({ retry }: ErrorBoundaryProps) {
  return <View style={styles.screen}><Text accessibilityRole="header" style={styles.title}>Unable to display this screen</Text><Text style={styles.text}>Please try again. Your saved offline game stays on this device.</Text><Pressable accessibilityRole="button" style={styles.button} onPress={() => { void retry(); }}><Text style={styles.text}>Try again</Text></Pressable></View>;
}
const styles = StyleSheet.create({ screen: { flex: 1, padding: 28, justifyContent: 'center', backgroundColor: '#FAFAFA', gap: 20 }, title: { fontSize: 24, fontWeight: '700', color: '#1C1C1E' }, text: { fontSize: 17, color: '#1C1C1E' }, button: { minHeight: 48, padding: 14, borderRadius: 12, backgroundColor: '#D9E8FF' } });
