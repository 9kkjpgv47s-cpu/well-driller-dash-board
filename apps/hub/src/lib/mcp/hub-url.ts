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
