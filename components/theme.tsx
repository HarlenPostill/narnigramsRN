import {
  ThemeProvider,
  DarkTheme,
  DefaultTheme,
} from "@react-navigation/native";
import { useResolvedScheme } from "@/hooks/use-colors";

export function Theme({ children }: { children: React.ReactNode }) {
  const scheme = useResolvedScheme();
  return (
    <ThemeProvider value={scheme === "dark" ? DarkTheme : DefaultTheme}>
      {children}
    </ThemeProvider>
  );
}
