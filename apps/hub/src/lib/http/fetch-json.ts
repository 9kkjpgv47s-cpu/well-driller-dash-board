/** Browser-side JSON fetch helpers shared by the hub panels. */

export function isAbortError(e: unknown): boolean {
  return e instanceof Error && e.name === "AbortError";
}

/**
 * Fetches JSON and throws an `Error` carrying the route's `{ error }` message
 * (falling back to the status text) when the response is not ok.
 */
export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();
  let parsed: unknown = undefined;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = undefined;
    }
  }

  if (!res.ok) {
    const errorField = (parsed as { error?: unknown } | undefined)?.error;
    throw new Error(
      typeof errorField === "string" && errorField
        ? errorField
        : res.statusText || `Request failed with status ${res.status}`,
    );
  }
  if (parsed === undefined) {
    throw new Error(`Malformed JSON response from ${url}`);
  }
  return parsed as T;
}

/** Like `fetchJson`, but resolves to `fallback` on any error or bad status. */
export async function fetchJsonOrFallback<T>(
  url: string,
  fallback: T,
  init?: RequestInit,
): Promise<T> {
  try {
    return await fetchJson<T>(url, init);
  } catch {
    return fallback;
  }
}
