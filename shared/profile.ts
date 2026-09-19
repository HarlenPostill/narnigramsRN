// Names are public labels, not unique account identifiers.
export function normalizeDisplayName(value: unknown): string | null {
  if (typeof value !== "string" || /[\p{Cc}\p{Cf}]/u.test(value)) return null;
  const name = value.normalize("NFC").trim().replace(/\s+/gu, " ");
  return [...name].length >= 1 && [...name].length <= 30 ? name : null;
}
