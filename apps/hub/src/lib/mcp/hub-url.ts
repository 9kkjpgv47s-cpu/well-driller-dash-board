/** Public hub origin for map deep links in MCP tool responses. */
export function hubPublicUrl(): string {
  return (
    process.env.HUB_PUBLIC_URL?.replace(/\/$/, "") ||
    "https://driller-hub.vercel.app"
  );
}

/** `/` already accepts `?lat=&lon=` deep links. */
export function mapDeepLink(lat: number, lon: number): string {
  return `${hubPublicUrl()}/?lat=${lat}&lon=${lon}`;
}

/**
 * Canonical RFC 8707 resource identifier for the MCP endpoint — must match
 * exactly what operators enter as the Resource Indicator at the IdP.
 */
export function mcpResourceUrl(): string {
  return `${hubPublicUrl()}/api/mcp`;
}
