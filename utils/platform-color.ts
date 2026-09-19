import { Appearance, Platform, PlatformColor as nativeColor } from 'react-native';
// React Native Web does not implement Apple's semantic PlatformColor API.
export function PlatformColor(name: string) {
  if (Platform.OS !== 'web') return nativeColor(name);
  const dark = Appearance.getColorScheme() === 'dark';
  const colors: Record<string, string> = { label: dark ? '#F2F2F7' : '#1C1C1E', secondaryLabel: dark ? '#AEAEB2' : '#636366', tertiaryLabel: dark ? '#AEAEB2' : '#636366', systemBackground: '#FAFAFA', secondarySystemBackground: '#F2F2F7' };
  return colors[name] ?? '#1C1C1E';
}
