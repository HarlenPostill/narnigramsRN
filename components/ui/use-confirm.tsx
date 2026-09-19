import { useState } from 'react';
import { Alert, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/use-colors';
interface Confirmation { title: string; message: string; action: () => void; label: string }
/** Native alerts on iOS, an accessible app dialog in the browser debug build. */
export function useConfirm() {
  const [request, setRequest] = useState<Confirmation | null>(null);
  const colors = useColors();
  const confirm = (title: string, message: string, action: () => void, label = 'Continue') => {
    if (Platform.OS === 'web') setRequest({ title, message, action, label });
    else Alert.alert(title, message, [{ text: 'Cancel', style: 'cancel' }, { text: label, style: 'destructive', onPress: action }]);
  };
  const dialog = <Modal visible={request !== null} transparent animationType="fade" onRequestClose={() => setRequest(null)}>
    <View style={[styles.overlay, { backgroundColor: colors.overlayBg }]}><View accessibilityViewIsModal style={[styles.card, { backgroundColor: colors.cardBg }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>{request?.title}</Text>
      <Text style={{ color: colors.textPrimary, fontSize: 16 }}>{request?.message}</Text>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" style={styles.button} onPress={() => setRequest(null)}><Text style={{ color: colors.textPrimary }}>Cancel</Text></Pressable>
        <Pressable accessibilityRole="button" style={styles.button} onPress={() => { const action = request?.action; setRequest(null); action?.(); }}><Text style={{ color: '#D32F2F', fontWeight: '700' }}>{request?.label}</Text></Pressable>
      </View>
    </View></View>
  </Modal>;
  return { confirm, dialog };
}
const styles = StyleSheet.create({ overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }, card: { maxWidth: 450, width: '100%', padding: 24, borderRadius: 16, borderCurve: 'continuous', gap: 20 }, title: { fontSize: 22, fontWeight: '700' }, actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 24 }, button: { minHeight: 48, minWidth: 60, justifyContent: 'center' } });
