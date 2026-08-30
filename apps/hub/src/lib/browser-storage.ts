/**
 * `localStorage` access that is safe during SSR and in private-mode browsers
 * where reads/writes can throw.
 */

export function readStoredString(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStoredString(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* quota / private mode — persistence is best-effort */
  }
}

export function readStoredNumber(key: string): number | null {
  const n = parseFloat(readStoredString(key) ?? "");
  return Number.isFinite(n) ? n : null;
}

export function readStoredJson<T>(key: string): T | null {
  const raw = readStoredString(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeStoredJson(key: string, value: unknown): void {
  try {
    writeStoredString(key, JSON.stringify(value));
  } catch {
    /* unserializable value — nothing to persist */
  }
}
