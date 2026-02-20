import { Asset } from "expo-asset";
import { File } from "expo-file-system/next";

let dictionary: Set<string> | null = null;

export async function loadDictionary(): Promise<Set<string>> {
  if (dictionary) return dictionary;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const [asset] = await Asset.loadAsync(require("../assets/words.txt"));
  const uri = asset.localUri;
  if (!uri) throw new Error("Failed to load dictionary asset");

  const file = new File(uri);
  const text = await file.text();
  dictionary = new Set(
    text
      .split("\n")
      .map((w) => w.trim().toUpperCase())
      .filter((w) => w.length > 0),
  );

  return dictionary;
}

export function isValidWord(word: string): boolean {
  if (!dictionary) return true; // fail-open if not loaded yet
  return dictionary.has(word.toUpperCase());
}
