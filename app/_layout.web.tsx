export { AppErrorBoundary as ErrorBoundary } from "@/components/error-boundary";
import { Theme } from '@/components/theme';
import { AuthProvider } from '@/hooks/use-auth';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
// Web debugging keeps ordinary browser navigation; iOS retains native tabs.
export default function WebRootLayout() {
  return <Theme><AuthProvider><Tabs screenOptions={{ headerShown: false, tabBarIcon: () => null, tabBarIconStyle: { display: 'none' }, tabBarLabelPosition: 'beside-icon', tabBarLabelStyle: { fontSize: 15, margin: 0 }, tabBarItemStyle: { justifyContent: 'center' } }}>
    <Tabs.Screen name="(play)" options={{ title: 'Play' }} />
    <Tabs.Screen name="(stats)" options={{ title: 'Stats' }} />
    <Tabs.Screen name="(settings)" options={{ title: 'Settings' }} />
  </Tabs><StatusBar style="auto" /></AuthProvider></Theme>;
}
