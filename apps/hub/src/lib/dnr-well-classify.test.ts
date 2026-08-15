import { describe, expect, it } from "vitest";
import type { WellRecord } from "@/lib/area-well-analytics";
import {
  classifyDrillingWell,
  markerColorForCategory,
  wellMatchesDrillingFilters,
} from "./dnr-well-classify";

const ALL_ON = {
  showUnconsolidated: true,
  showRock: true,
  showUnverified: true,
};

describe("classifyDrillingWell", () => {
  it("flags dry holes from the aquifer text before anything else", () => {
    const w: WellRecord = { aquifer: "DRY HOLE", well_type: "dug well" };
    expect(classifyDrillingWell(w)).toBe("dry");
  });

  it("flags hand dug / bucket wells from type and use columns", () => {
    expect(classifyDrillingWell({ well_type: "Hand Dug" })).toBe("bucket");
    expect(classifyDrillingWell({ well_use: "dug domestic" })).toBe("bucket");
    expect(classifyDrillingWell({ pump_type: "BUCKET" })).toBe("bucket");
  });

  it("flags estimated locations from aquifer or loc type", () => {
    expect(classifyDrillingWell({ aquifer: "Estimated sand" })).toBe("estimated");
    expect(classifyDrillingWell({ loc_type: "ESTIMATED" })).toBe("estimated");
    expect(classifyDrillingWell({ location_type: "estimated centroid" })).toBe(
      "estimated",
    );
  });

  it("splits unconsolidated from rock on aquifer wording", () => {
    expect(classifyDrillingWell({ aquifer: "Sand and Gravel" })).toBe(
      "unconsolidated",
    );
    expect(classifyDrillingWell({ aquifer: "Unconsolidated outwash" })).toBe(
      "unconsolidated",
    );
    expect(classifyDrillingWell({ aquifer: "Silurian Limestone" })).toBe("rock");
    expect(classifyDrillingWell({ aquifer: "sandstone bedrock" })).toBe("rock");
  });

  it("defaults to rock when there is no aquifer text", () => {
    expect(classifyDrillingWell({})).toBe("rock");
    expect(classifyDrillingWell({ aquifer: "   " })).toBe("rock");
  });
});

describe("markerColorForCategory", () => {
  it("gives every category a distinct color", () => {
    const colors = (
      ["unconsolidated", "rock", "estimated", "bucket", "dry"] as const
    ).map(markerColorForCategory);
    expect(new Set(colors).size).toBe(colors.length);
  });
});

describe("wellMatchesDrillingFilters", () => {
  it("hides everything when all toggles are off", () => {
    expect(
      wellMatchesDrillingFilters(
        { aquifer: "sand" },
        { showUnconsolidated: false, showRock: false, showUnverified: false },
      ),
    ).toBe(false);
  });

  it("keeps dry and bucket wells visible whenever any toggle is on", () => {
    const opts = {
      showUnconsolidated: false,
      showRock: false,
      showUnverified: true,
    };
    expect(wellMatchesDrillingFilters({ aquifer: "dry" }, opts)).toBe(true);
    expect(wellMatchesDrillingFilters({ well_type: "hand dug" }, opts)).toBe(true);
  });

  it("gates each remaining category on its own toggle", () => {
    const unconsolidated: WellRecord = { aquifer: "sand" };
    const rock: WellRecord = { aquifer: "limestone" };
    const estimated: WellRecord = { loc_type: "estimated" };

    expect(wellMatchesDrillingFilters(unconsolidated, ALL_ON)).toBe(true);
    expect(
      wellMatchesDrillingFilters(unconsolidated, {
        ...ALL_ON,
        showUnconsolidated: false,
      }),
    ).toBe(false);
    expect(
      wellMatchesDrillingFilters(rock, { ...ALL_ON, showRock: false }),
    ).toBe(false);
    expect(
      wellMatchesDrillingFilters(estimated, { ...ALL_ON, showUnverified: false }),
    ).toBe(false);
  });
});
