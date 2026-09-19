import { Asset } from "expo-asset";
import { readAsStringAsync } from "expo-file-system/legacy";
import { Platform } from "react-native";
let dictionary: Set<string> | null = null;
let pending: Promise<Set<string>> | null = null;
export async function loadDictionary(): Promise<Set<string>> {
  if (dictionary) return dictionary;
  if (pending) return pending;
  pending = (async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const [asset] = await Asset.loadAsync(require("../assets/words.txt"));
    let text: string;
    if (Platform.OS === "web") {
      const response = await fetch(asset.uri);
      if (!response.ok) throw new Error("Word list request failed");
      text = await response.text();
    } else {
      if (!asset.localUri) throw new Error("Word list asset unavailable");
      // SDK 54 File.text() rejects the read-only iOS application-bundle URI
      // in Release. The supported legacy reader handles bundled assets correctly.
      text = await readAsStringAsync(asset.localUri);
    }
    const words = new Set(text.split(/\r?\n/).map((word) => word.trim().toUpperCase()).filter((word) => /^[A-Z]{2,}$/.test(word)));
    if (words.size < 1000) throw new Error("Word list is incomplete");
    dictionary = words;
    return words;
  })();
  try { return await pending; } finally { pending = null; }
}
export function isValidWord(word: string): boolean { return dictionary?.has(word.toUpperCase()) ?? false; }
