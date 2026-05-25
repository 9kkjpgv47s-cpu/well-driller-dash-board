import type { DispatchParseResult } from "./dispatch-parse";

export type JobSharePayload = {
  v: 1;
  lat: number;
  lon: number;
  raw: string;
  title?: string | null;
  feetOffDrive?: number;
};

export function buildJobSharePayload(
  lat: number,
  lon: number,
  raw: string,
  parsed: DispatchParseResult,
  feetOffDrive?: number,
): JobSharePayload {
  return {
    v: 1,
    lat,
    lon,
    raw,
    title: parsed.title,
    feetOffDrive,
  };
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const pad = value.length % 4 === 0 ? "" : "=".repeat(4 - (value.length % 4));
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export function encodeJobShareParam(payload: JobSharePayload): string {
  const json = JSON.stringify(payload);
  return bytesToBase64Url(new TextEncoder().encode(json));
}

export function decodeJobShareParam(param: string): JobSharePayload | null {
  try {
    const json = new TextDecoder().decode(base64UrlToBytes(param.trim()));
    const data = JSON.parse(json) as JobSharePayload;
    if (data.v !== 1) return null;
    if (!Number.isFinite(data.lat) || !Number.isFinite(data.lon)) return null;
    if (typeof data.raw !== "string" || !data.raw.trim()) return null;
    return data;
  } catch {
    return null;
  }
}

export function buildJobShareUrl(
  origin: string,
  payload: JobSharePayload,
): string {
  const url = new URL(origin);
  url.pathname = "/";
  url.search = "";
  url.searchParams.set("job", encodeJobShareParam(payload));
  return url.toString();
}
