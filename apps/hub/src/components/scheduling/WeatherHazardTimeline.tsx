"use client";

import {
  HAZARD_TIER_STYLES,
  hazardTierFromWeatherCode,
  upcomingHourlyWindow,
} from "@/lib/weather/hazard-timeline";
import type { WeatherHourly } from "@/lib/weather/types";

function stripClock(time: string): string {
  const m = time.match(/^(\d{4}-\d{2}-\d{2})T(\d{1,2}):(\d{2})/);
  if (!m) return "?";
  let hh = parseInt(m[2], 10);
  const mm = m[3];
  const ap = hh >= 12 ? "p" : "a";
  hh = hh % 12 || 12;
  return `${hh}:${mm}${ap}`;
}

type Props = {
  hourly: WeatherHourly[];
  /** How many future hours to show (max). */
  maxHours?: number;
};

/**
 * Hour-by-hour hazard strip from model weather codes (not official NWS watches).
 * Green → red encodes thunder, ice, heavy snow/rain, etc. for quick field scanning.
 */
export function WeatherHazardTimeline({ hourly, maxHours = 12 }: Props) {
  const slice = upcomingHourlyWindow(hourly, Date.now(), maxHours);
  if (!slice.length) {
    return (
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        No upcoming hourly rows in this model window — widen the forecast pull or
        try again later.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-600 dark:text-zinc-300">
        <strong>12-hour hazard strip</strong> (model guidance only — not NWS
        warnings). Each block is one hour; color is from Open-Meteo weather codes
        (thunder, ice, snow, heavy rain score higher).
      </p>
      <div
        className="flex w-full gap-0.5 overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-900/80"
        role="list"
        aria-label="Hourly hazard outlook"
      >
        {slice.map((h) => {
          const tier = hazardTierFromWeatherCode(h.weatherCode);
          const st = HAZARD_TIER_STYLES[tier];
          const tip = `${h.time} — ${h.conditionLabel} · ${Math.round(h.tempF)}°F · POP ${h.precipPop ?? "—"}%`;
          return (
            <div
              key={h.time}
              className="flex min-h-[52px] min-w-[2.25rem] flex-1 flex-col justify-end"
              role="listitem"
            >
              <div
                className={`mx-auto w-full max-w-[2.5rem] flex-1 rounded-sm ${st.bar} min-h-[20px]`}
                title={tip}
              />
              <p className="mt-1 text-center text-[10px] leading-none text-zinc-600 dark:text-zinc-400">
                {stripClock(h.time)}
              </p>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
        Storm <em>tracks</em> and polygon watches need NOAA / SPC data and a
        separate integration — this strip is a compact hourly risk read from the
        same forecast as the table below.
      </p>
    </div>
  );
}
