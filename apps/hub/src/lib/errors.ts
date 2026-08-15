/**
 * Small helpers so failures always carry a readable message and never disappear
 * silently: `errorMessage` for user-facing strings, `logError` for the server
 * log line that keeps the original cause (stack, upstream status) diagnosable.
 */

export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err.trim()) return err.trim();
  return fallback;
}

export function logError(scope: string, err: unknown): void {
  console.error(`[${scope}]`, err);
}

export function logWarning(scope: string, message: string, err?: unknown): void {
  if (err === undefined) {
    console.warn(`[${scope}] ${message}`);
    return;
  }
  console.warn(`[${scope}] ${message}`, err);
}
