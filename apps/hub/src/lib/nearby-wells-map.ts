import type { NearbyWellMock } from "@/lib/nearby-wells-mock";
import { wellLatLonFromMock } from "@/lib/map-geometry";

export type WellOnMap = NearbyWellMock & { mapLat: number; mapLon: number };

export function wellsWithMapPositions(
  jobLat: number,
  jobLon: number,
  wells: NearbyWellMock[],
): WellOnMap[] {
  return wells.map((w) => {
    const { lat, lon } = wellLatLonFromMock(jobLat, jobLon, w.distanceMi, w.bearing);
    return { ...w, mapLat: lat, mapLon: lon };
  });
}
