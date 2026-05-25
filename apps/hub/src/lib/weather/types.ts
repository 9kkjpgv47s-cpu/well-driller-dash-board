export type WeatherHourly = {
  time: string;
  tempF: number;
  precipPop: number | null;
  /** Hourly precipitation total (inches) when available from Open-Meteo. */
  precipInches: number | null;
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
  /** Sum of hourly precipitation (inches) for this calendar day. */
  totalPrecipInches: number | null;
  /** Count of hourly periods flagged as thunderstorm. */
  thunderstormHours: number;
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
