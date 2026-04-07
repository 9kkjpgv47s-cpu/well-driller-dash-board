import type { DispatchParseResult } from "@/lib/dispatch-parse";

export type DirectionsLinks = {
  google: string;
  apple: string;
  waze: string;
  /** Human label for the destination */
  destinationLabel: string;
};

/**
 * Universal links to start driving directions in Google Maps, Apple Maps, or Waze.
 * Opens the native app or website with destination pre-filled (no origin = user's current location in-app).
 * Embedded turn-by-turn inside this web app would require Maps APIs (e.g. Google Directions) and is not the same as these deep links.
 */
export function directionsLinksForDispatch(
  parsed: DispatchParseResult,
): DirectionsLinks | null {
  const { lat, lon, address } = parsed;

  if (lat !== null && lon !== null) {
    const ll = `${lat},${lon}`;
    return {
      google: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ll)}`,
      apple: `https://maps.apple.com/?daddr=${encodeURIComponent(ll)}`,
      waze: `https://www.waze.com/ul?ll=${lat}%2C${lon}&navigate=yes`,
      destinationLabel: `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
    };
  }

  const addr = address?.trim();
  if (addr) {
    return {
      google: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`,
      apple: `https://maps.apple.com/?daddr=${encodeURIComponent(addr)}`,
      waze: `https://www.waze.com/ul?q=${encodeURIComponent(addr)}&navigate=yes`,
      destinationLabel: addr,
    };
  }

  return null;
}
