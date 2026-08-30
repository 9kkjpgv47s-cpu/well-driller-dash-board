import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

function elevationRequest(locations: { lat: number; lon: number }[]) {
  return new NextRequest("http://localhost/api/elevation", {
    method: "POST",
    body: JSON.stringify({ locations }),
  });
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/elevation", () => {
  it("fails loudly when OpenTopoData fails and Open-Elevation is malformed", async () => {
    vi.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("opentopodata"))
        return Promise.resolve(new Response("nope", { status: 503 }));
      return Promise.resolve(jsonResponse({ results: undefined }));
    });

    const res = await POST(elevationRequest([{ lat: 40, lon: -85 }]));
    expect(res.status).toBe(502);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toContain("Open-Elevation");
  });

  it("fails loudly when Open-Elevation returns the wrong result count", async () => {
    vi.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("opentopodata"))
        return Promise.resolve(new Response("nope", { status: 503 }));
      return Promise.resolve(jsonResponse({ results: [{ elevation: 250 }] }));
    });

    const res = await POST(
      elevationRequest([
        { lat: 40, lon: -85 },
        { lat: 41, lon: -86 },
      ]),
    );
    expect(res.status).toBe(502);
  });

  it("keeps per-location nulls when the fallback payload is well formed", async () => {
    vi.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("opentopodata"))
        return Promise.resolve(new Response("nope", { status: 503 }));
      return Promise.resolve(
        jsonResponse({ results: [{ elevation: 250 }, { elevation: null }] }),
      );
    });

    const res = await POST(
      elevationRequest([
        { lat: 40, lon: -85 },
        { lat: 41, lon: -86 },
      ]),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { elevationsM: (number | null)[] };
    expect(body.elevationsM).toEqual([250, null]);
  });
});
