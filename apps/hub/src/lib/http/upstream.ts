/** Identifies the hub to third-party APIs (Nominatim, NWS, elevation DEMs). */
export const HUB_USER_AGENT =
  "DrillerDashboardHub/1.0 (field planning; +https://github.com/9kkjpgv47s-cpu/well-driller-dash-board)";

/** Request headers for upstream JSON APIs; `accept` covers geo+json variants. */
export function upstreamJsonHeaders(
  accept = "application/json",
): Record<string, string> {
  return { Accept: accept, "User-Agent": HUB_USER_AGENT };
}
