import { describe, expect, it } from "vitest";
import {
  extractCoordinates,
  extractAddress,
  extractDistanceOffDrive,
  extractPumpHp,
  parseDispatchEmail,
} from "./dispatch-parse";

const TWENTY20_DISPATCH = `Twenty20 Design
6213 SR 32, Anderson, IN 46011 United States
5" New Con 
3/4hp CPPS
40.100369.-85.789937
50' off of driveway
Rough-ins as of 5/15
(765) 713-3523 (765) 617-2997`;

describe("extractPumpHp", () => {
  it("captures decimal horsepower before hp suffix", () => {
    expect(
      extractPumpHp(
        '5" New Con 1.5hp CPPS 40.058703,-86.113849 200\' off of drive',
      ),
    ).toBe("1.5hp");
  });

  it("captures whole-number hp", () => {
    expect(extractPumpHp("Install 2hp submersible")).toBe("2hp");
  });

  it("captures fraction hp", () => {
    expect(extractPumpHp("3/4hp CPPS")).toBe("3/4hp");
  });
});

describe("extractCoordinates", () => {
  it("parses comma-separated pair", () => {
    expect(extractCoordinates("40.058703,-86.113849")).toEqual({
      lat: 40.058703,
      lon: -86.113849,
    });
  });

  it("parses dot-glued pair (mobile copy-paste)", () => {
    expect(extractCoordinates("40.100369.-85.789937")).toEqual({
      lat: 40.100369,
      lon: -85.789937,
    });
  });

  it("parses space-separated pair", () => {
    expect(extractCoordinates("40.100369 -85.789937")).toEqual({
      lat: 40.100369,
      lon: -85.789937,
    });
  });

  it("parses Google Maps @lat,lon", () => {
    expect(extractCoordinates("https://maps.google.com/?q=@40.1,-85.79")).toEqual({
      lat: 40.1,
      lon: -85.79,
    });
  });

  it("adds minus for unsigned Indiana west longitudes", () => {
    expect(extractCoordinates("39.76, 86.45")).toEqual({
      lat: 39.76,
      lon: -86.45,
    });
  });
});

describe("extractAddress", () => {
  it("recognizes Indiana SR route addresses", () => {
    expect(
      extractAddress("6213 SR 32, Anderson, IN 46011 United States"),
    ).toBe("6213 SR 32, Anderson, IN 46011 United States");
  });
});

describe("extractDistanceOffDrive", () => {
  it("captures off of driveway phrasing", () => {
    expect(extractDistanceOffDrive("50' off of driveway")).toBe(
      "50 ft off drive",
    );
  });

  it("captures off of drive phrasing", () => {
    expect(extractDistanceOffDrive("200' off of drive")).toBe(
      "200 ft off drive",
    );
  });
});

describe("parseDispatchEmail", () => {
  it("parses Twenty20 Design dispatch with dot-glued coords", () => {
    const result = parseDispatchEmail(TWENTY20_DISPATCH);
    expect(result.locationSource).toBe("coordinates");
    expect(result.lat).toBeCloseTo(40.100369, 5);
    expect(result.lon).toBeCloseTo(-85.789937, 5);
    expect(result.title).toBe("Twenty20 Design");
    expect(result.address).toBe(
      "6213 SR 32, Anderson, IN 46011 United States",
    );
    expect(result.pumpHp).toBe("3/4hp");
    expect(result.distanceOffDrive).toBe("50 ft off drive");
    expect(result.phone).toBe("(765) 713-3523");
    expect(result.scheduleLine).toBeNull();
    expect(result.warnings).toHaveLength(0);
  });
});
