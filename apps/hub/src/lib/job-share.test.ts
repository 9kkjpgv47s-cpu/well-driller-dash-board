import { describe, expect, it } from "vitest";
import {
  buildJobSharePayload,
  buildJobShareUrl,
  decodeJobShareParam,
  encodeJobShareParam,
} from "./job-share";

describe("job-share", () => {
  it("round-trips a shared job payload", () => {
    const payload = buildJobSharePayload(
      39.40795,
      -85.86295,
      "Job near 123 Main\nLat 39.40795 Lon -85.86295",
      {
        title: "Smith residence",
        lat: 39.40795,
        lon: -85.86295,
        address: "123 Main St",
        notes: "Job near 123 Main",
        locationSource: "coordinates",
        warnings: [],
        scheduleLine: null,
        contactName: null,
        phone: null,
        pumpHp: "1.5 HP",
        distanceOffDrive: "180 ft off drive",
      },
      180,
    );
    const encoded = encodeJobShareParam(payload);
    const decoded = decodeJobShareParam(encoded);
    expect(decoded?.lat).toBeCloseTo(39.40795);
    expect(decoded?.raw).toContain("123 Main");
    expect(decoded?.title).toBe("Smith residence");
    expect(buildJobShareUrl("https://driller-hub.vercel.app", payload)).toContain(
      "?job=",
    );
  });
});
