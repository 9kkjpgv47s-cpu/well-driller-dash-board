/**
 * Persist the last pasted dispatch (job brief) on this browser/device.
 * Survives page refresh / accidental reloads until the user pastes a new
 * dispatch (or clears it). No server account — storage is localStorage only.
 */

export const DISPATCH_SESSION_KEY = "driller-hub-dispatch-session-v1";

/** Keep last job for 90 days even if unused; replaced immediately on new paste. */
export const DISPATCH_SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;

export type DispatchSessionCache = {
  v: 1;
  raw: string;
  savedAt: number;
  lat?: number;
  lon?: number;
  title?: string | null;
  feetOffDrive?: number;
};

function isFiniteCoord(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

export function parseDispatchSessionCache(
  rawJson: string | null,
  now = Date.now(),
): DispatchSessionCache | null {
  if (!rawJson) return null;
  try {
    const data = JSON.parse(rawJson) as Partial<DispatchSessionCache>;
    if (data.v !== 1) return null;
    if (typeof data.raw !== "string" || !data.raw.trim()) return null;
    if (typeof data.savedAt !== "number" || !Number.isFinite(data.savedAt)) {
      return null;
    }
    if (now - data.savedAt > DISPATCH_SESSION_TTL_MS) return null;

    const out: DispatchSessionCache = {
      v: 1,
      raw: data.raw,
      savedAt: data.savedAt,
    };

    if (isFiniteCoord(data.lat) && isFiniteCoord(data.lon)) {
      if (
        data.lat >= -90 &&
        data.lat <= 90 &&
        data.lon >= -180 &&
        data.lon <= 180
      ) {
        out.lat = data.lat;
        out.lon = data.lon;
      }
    }
    if (data.title === null || typeof data.title === "string") {
      out.title = data.title;
    }
    if (isFiniteCoord(data.feetOffDrive)) {
      out.feetOffDrive = data.feetOffDrive;
    }
    return out;
  } catch {
    return null;
  }
}

export function loadDispatchSession(
  now = Date.now(),
): DispatchSessionCache | null {
  if (typeof window === "undefined") return null;
  try {
    return parseDispatchSessionCache(
      window.localStorage.getItem(DISPATCH_SESSION_KEY),
      now,
    );
  } catch {
    return null;
  }
}

export function saveDispatchSession(
  patch: {
    raw: string;
    lat?: number;
    lon?: number;
    title?: string | null;
    feetOffDrive?: number;
    /** When true, drop any previously stored jobsite coords. */
    clearJobsite?: boolean;
  },
  now = Date.now(),
): DispatchSessionCache | null {
  if (typeof window === "undefined") return null;
  const raw = patch.raw.trim() ? patch.raw : "";
  if (!raw) {
    clearDispatchSession();
    return null;
  }

  const prev = loadDispatchSession(now);
  const next: DispatchSessionCache = {
    v: 1,
    raw: patch.raw,
    savedAt: now,
  };

  if (patch.clearJobsite) {
    // leave lat/lon unset
  } else if (isFiniteCoord(patch.lat) && isFiniteCoord(patch.lon)) {
    next.lat = patch.lat;
    next.lon = patch.lon;
  } else if (prev && isFiniteCoord(prev.lat) && isFiniteCoord(prev.lon)) {
    next.lat = prev.lat;
    next.lon = prev.lon;
  }

  if (patch.title !== undefined) {
    next.title = patch.title;
  } else if (prev?.title !== undefined) {
    next.title = prev.title;
  }

  if (patch.feetOffDrive !== undefined) {
    next.feetOffDrive = patch.feetOffDrive;
  } else if (prev?.feetOffDrive !== undefined) {
    next.feetOffDrive = prev.feetOffDrive;
  }

  try {
    window.localStorage.setItem(DISPATCH_SESSION_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
  return next;
}

export function clearDispatchSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DISPATCH_SESSION_KEY);
  } catch {
    /* ignore */
  }
}
