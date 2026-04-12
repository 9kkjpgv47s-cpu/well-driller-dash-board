export type WeatherHourly = {
  time: string;
  tempF: number;
  feelsLikeF: number | null;
  precipPop: number | null;
  cloudPct: number | null;
  windMph: number | null;
  windDirDeg: number | null;
  weatherCode: number;
  conditionLabel: string;
  sourceId: string;
  sourceLabel: string;
};

export type WeatherSourceBundle = {
  id: string;
  label: string;
  provider: string;
  model: string;
  hourly: WeatherHourly[];
  fetchedAt: string;
};

export type DayWeatherSummary = {
  date: string;
  maxPrecipPop: number | null;
  maxWindMph: number | null;
  minTempF: number | null;
  maxTempF: number | null;
  dominantCondition: string;
  /** How much GFS vs ECMWF max POP differs on this calendar day (if both exist) */
  modelSpreadPop?: number | null;
};

export type WeatherApiResponse = {
  lat: number;
  lon: number;
  timezone: string;
  anchorDate: string;
  fetchedAt: string;
  sources: WeatherSourceBundle[];
  /** Human-readable cross-source notes */
  explanations: string[];
  daySummaries: DayWeatherSummary[];
  /** Hours for anchorDate from primary source (first successful Open-Meteo) */
  primaryHourlyForDay: WeatherHourly[];
};
