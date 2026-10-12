/**
 * Real-data parity: 0.1° tiles vs the full committed registry.
 *
 * Gated behind TILES_PARITY=1 — parses ~33 MB of chunks plus the tiles needed
 * for 48 radius queries, so it is not part of the default suite.
 * Run: TILES_PARITY=1 npx vitest run src/lib/well-tiles.realdata.test.ts
 */
import { describe, expect, it } from "vitest";
import { computeAreaInsights } from "./area-well-analytics";
import { loadFullChunksFromDisk } from "./dnr-chunk-server";
import { loadWellsForRadiusFromTiles } from "./dnr-tile-server";
import { queryWellsNearby } from "./wells-nearby";
import { getWellSpatialIndex } from "./well-spatial-index";
import { DEFAULT_VIEWER_MAP_FILTERS } from "./viewer-well-map";

const CENTERS: Array<[string, number, number]> = [
  ["Indianapolis", 39.7684, -86.1581],
  ["Fort Wayne", 41.0793, -85.1394],
  ["Evansville", 37.9716, -87.5711],
  ["South Bend", 41.6764, -86.252],
  ["Bloomington", 39.1653, -86.5264],
  ["Lafayette", 40.4167, -86.8753],
  ["Metamora", 39.4453, -85.1297],
  ["Mooresville", 39.6009, -86.5265],
  ["Michigan City", 41.7075, -86.895],
  ["Jasper", 38.3914, -86.9311],
  ["corner-ish", 40.0001, -86.0001],
  ["sparse", 38.9, -86.9],
];
const RADII = [0.3, 2, 5, 25];

describe.skipIf(!process.env.TILES_PARITY)(
  "well tiles vs full registry (real chunks)",
  () => {
    it(
      "radius queries and area insights are identical from either source",
      { timeout: 180_000 },
      async () => {
        const full = await loadFullChunksFromDisk();
        expect(full.length).toBeGreaterThan(400_000);

        for (const [name, lat, lon] of CENTERS) {
          for (const radiusMiles of RADII) {
            const label = `${name} r=${radiusMiles}`;
            const tiled = await loadWellsForRadiusFromTiles(
              lat,
              lon,
              radiusMiles,
              { lithology: true },
            );

            // Distance-sorted path: deterministic (stable id tiebreak) → exact equality.
            const a = queryWellsNearby(full, {
              lat,
              lon,
              radiusMiles,
              limit: 800,
              includeLithology: true,
            });
            const b = queryWellsNearby(tiled.wells, {
              lat,
              lon,
              radiusMiles,
              limit: 800,
              includeLithology: true,
            });
            expect(b.totalInRadius, label).toBe(a.totalInRadius);
            expect(b.wells, label).toEqual(a.wells);
            expect(b.truncated, label).toBe(a.truncated);

            // Viewer-filter path: same in-radius count; same kept id set when untruncated.
            const af = queryWellsNearby(full, {
              lat,
              lon,
              radiusMiles,
              limit: 800,
              includeLithology: true,
              filters: DEFAULT_VIEWER_MAP_FILTERS,
            });
            const bf = queryWellsNearby(tiled.wells, {
              lat,
              lon,
              radiusMiles,
              limit: 800,
              includeLithology: true,
              filters: DEFAULT_VIEWER_MAP_FILTERS,
            });
            expect(bf.totalInRadius, `${label} filters`).toBe(af.totalInRadius);
            if (!af.truncated) {
              expect(
                new Set(bf.wells.map((w) => w.id)),
                `${label} filter id set`,
              ).toEqual(new Set(af.wells.map((w) => w.id)));
            }

            // Area insights at the two UI radii.
            if (radiusMiles <= 2) {
              const ra = computeAreaInsights(full, lat, lon, radiusMiles, {
                wellsInRadius: getWellSpatialIndex(full).queryRadius(
                  lat,
                  lon,
                  radiusMiles,
                ),
              });
              const rb = computeAreaInsights(tiled.wells, lat, lon, radiusMiles, {
                wellsInRadius: getWellSpatialIndex(tiled.wells).queryRadius(
                  lat,
                  lon,
                  radiusMiles,
                ),
              });
              expect(rb, `${label} insights`).toEqual(ra);
            }
          }
        }
      },
    );
  },
);
