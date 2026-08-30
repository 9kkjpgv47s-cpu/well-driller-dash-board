/**
 * `localStorage` access that is safe during SSR and in private-mode browsers
 * where reads/writes can throw. Failures are best-effort but never silent:
 * writes report whether the value was persisted, and every swallowed throw is
 * logged so blocked storage is diagnosable from the console.
 */

import { logWarning } from "@/lib/errors";

export function readStoredString(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch (e) {
    logWarning("browser-storage", `${key} unreadable`, e);
    return null;
  }
}

/** False when the value could not be persisted (quota, private mode, SSR). */
export function writeStoredString(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (e) {
    logWarning("browser-storage", `${key} not persisted`, e);
    return false;
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
  } catch (e) {
    logWarning("browser-storage", `${key} holds unparseable JSON`, e);
    return null;
  }
}

/** False when the value could not be serialized or persisted. */
export function writeStoredJson(key: string, value: unknown): boolean {
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch (e) {
    logWarning("browser-storage", `${key} value is unserializable`, e);
    return false;
  }
  return writeStoredString(key, serialized);
}
