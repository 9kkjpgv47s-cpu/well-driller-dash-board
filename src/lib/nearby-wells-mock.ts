export type NearbyWellMock = {
  refno: string;
  distanceMi: number;
  bearing: string;
  depthFt: number;
  /** Mocked typical gravel interval thickness (inches) */
  gravelVeinIn: number;
  /** Depth below grade where vein is centered (ft) */
  veinDepthFt: number;
  county: string;
};

function hash01(lat: number, lon: number, salt: string) {
  const s = `${lat.toFixed(5)},${lon.toFixed(5)},${salt}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return (h % 1000) / 1000;
}

const bearings = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

/** Deterministic mock “registry neighbors” for driller briefing — replace with real data later. */
export function mockNearbyWells(
  lat: number,
  lon: number,
  count = 6,
): NearbyWellMock[] {
  const wells: NearbyWellMock[] = [];
  for (let i = 0; i < count; i++) {
    const salt = `w${i}`;
    const dist = 0.15 + hash01(lat, lon, salt) * 1.2 + i * 0.08;
    const depth = Math.round(95 + hash01(lat, lon, `d${i}`) * 110);
    const gravel = Math.round(4 + hash01(lat, lon, `g${i}`) * 18);
    const veinDepth = Math.round(35 + hash01(lat, lon, `v${i}`) * 55);
    const br = bearings[Math.floor(hash01(lat, lon, `b${i}`) * bearings.length)];
    const ref = `${1000000 + Math.floor(hash01(lat, lon, `r${i}`) * 899999)}`;
    const counties = [
      "Marion",
      "Hamilton",
      "Johnson",
      "Boone",
      "Hendricks",
      "Lake",
    ];
    const county = counties[Math.floor(hash01(lat, lon, `c${i}`) * counties.length)]!;
    wells.push({
      refno: ref,
      distanceMi: Math.round(dist * 100) / 100,
      bearing: br,
      depthFt: depth,
      gravelVeinIn: gravel,
      veinDepthFt: veinDepth,
      county,
    });
  }
  wells.sort((a, b) => a.distanceMi - b.distanceMi);
  return wells;
}

export function mockAreaStats(wells: NearbyWellMock[]) {
  if (wells.length === 0) {
    return {
      avgDepthFt: 0,
      medianDepthFt: 0,
      avgGravelIn: 0,
      veinDepthBandFt: "—",
    };
  }
  const depths = wells.map((w) => w.depthFt).sort((a, b) => a - b);
  const gravels = wells.map((w) => w.gravelVeinIn);
  const veins = wells.map((w) => w.veinDepthFt).sort((a, b) => a - b);
  const avgDepth = Math.round(
    depths.reduce((a, b) => a + b, 0) / depths.length,
  );
  const medianDepth = depths[Math.floor(depths.length / 2)]!;
  const avgGravel = Math.round(
    gravels.reduce((a, b) => a + b, 0) / gravels.length,
  );
  const low = veins[0]!;
  const high = veins[veins.length - 1]!;
  return {
    avgDepthFt: avgDepth,
    medianDepthFt: medianDepth,
    avgGravelIn: avgGravel,
    veinDepthBandFt: `${low}–${high} ft`,
  };
}
