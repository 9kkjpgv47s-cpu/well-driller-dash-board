import { NextResponse } from "next/server";

/** JSON error envelope every hub route returns: `{ error: string }`. */
export function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * JSON body with the hub's CDN caching convention: `s-maxage` seconds of edge
 * freshness plus twice that as the stale-while-revalidate window.
 */
export function cachedJson(
  body: unknown,
  sMaxAgeSeconds: number,
  extraHeaders?: Record<string, string>,
): NextResponse {
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": `public, s-maxage=${sMaxAgeSeconds}, stale-while-revalidate=${sMaxAgeSeconds * 2}`,
      ...extraHeaders,
    },
  });
}

/**
 * 503 telling the client to fall back to browser-side chunk load, preserving
 * the thrown message when there is one.
 */
export function clientChunkFallback(
  e: unknown,
  defaultMessage: string,
): NextResponse {
  return NextResponse.json(
    {
      error: e instanceof Error ? e.message : defaultMessage,
      fallback: "client-chunks",
    },
    { status: 503 },
  );
}

/** 503 for a failed server-side DNR chunk load. */
export function dnrWellsUnavailable(e: unknown): NextResponse {
  return clientChunkFallback(
    e,
    "Failed to load DNR chunk data on the server.",
  );
}
