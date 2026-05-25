/**
 * @vitest-environment happy-dom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WellDepthThermometer } from "./WellDepthThermometer";

afterEach(() => {
  cleanup();
});

describe("WellDepthThermometer", () => {
  const wells = [
    { id: "A-1", lat: 40.1, lon: -85.1, depth: "120" },
    { id: "B-2", lat: 40.11, lon: -85.11, depth: "240" },
    { id: "C-3", lat: 40.12, lon: -85.12, depth: "280" },
  ];

  it("renders borehole and radius selector", () => {
    render(
      createElement(WellDepthThermometer, {
        wells,
        radiusMiles: 0.3,
        onRadiusChange: () => {},
        medianDepthFt: 240,
        onSelectWell: () => {},
      }),
    );

    expect(screen.getByLabelText(/Borehole cross-section/i)).toBeTruthy();
    expect(screen.getByLabelText(/Depth view search radius/i)).toBeTruthy();
    expect(screen.getAllByText(/3 plotted/i).length).toBeGreaterThan(0);
  });

  it("calls onSelectWell when a well marker is activated", () => {
    const onSelectWell = vi.fn();
    render(
      createElement(WellDepthThermometer, {
        wells,
        radiusMiles: 0.3,
        medianDepthFt: 240,
        onSelectWell,
      }),
    );

    const btn = screen.getAllByRole("button", {
      name: /Well B-2, 240 feet/i,
    })[0]!;
    fireEvent.click(btn);
    expect(onSelectWell).toHaveBeenCalledWith(
      expect.objectContaining({ id: "B-2" }),
    );
  });

  it("calls onDepthChange when target depth changes", () => {
    const onDepthChange = vi.fn();
    render(
      createElement(WellDepthThermometer, {
        wells,
        radiusMiles: 0.3,
        medianDepthFt: 240,
        onSelectWell: () => {},
        onDepthChange,
      }),
    );

    const slider = screen.getAllByLabelText(/Your depth in the hole/i)[0]!;
    fireEvent.change(slider, { target: { value: "200" } });
    expect(onDepthChange).toHaveBeenCalledWith(200);
  });
});
