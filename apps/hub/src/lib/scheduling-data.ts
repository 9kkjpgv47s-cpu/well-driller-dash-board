export type JobStatus = "planned" | "en_route" | "on_site" | "complete";

/** No clock slots — either one job per crew-day or two (first/second). */
export type DaySlotIndex = 0 | 1;

export type JobsPerDay = 1 | 2;

export type HorizonView = "week" | "month";

export type DrillJob = {
  id: string;
  title: string;
  county: string;
  /** YYYY-MM-DD (workday) */
  date: string;
  /** 0-based crew: 0 = Crew 1 … 4 = Crew 5 */
  crewIndex: number;
  /** 0 = first job that day, 1 = second when running 2/day */
  daySlot: DaySlotIndex;
  rig: string;
  lead: string;
  status: JobStatus;
  lat: number;
  lon: number;
  /** One-way yard → site, minutes */
  driveMinutesFromYard: number;
  /** Hose / staging distance; >30 ft ⇒ stricter weather gate */
  feetOffDrive: number;
  isEmergency: boolean;
  /** 0–100 heuristic for routing / success (mock until analytics service) */
  routingFitScore: number;
  customerNotes?: string;
};

export type ScheduleConfig = {
  /** Active crews 1–5; default 3 */
  activeCrews: number;
  jobsPerDay: JobsPerDay;
};

export const CREW_LIMIT = 5;
export const DEFAULT_CREWS = 3;
export const DEFAULT_JOBS_PER_DAY: JobsPerDay = 1;

export type DemoJobSeed = Omit<
  DrillJob,
  "id" | "date" | "crewIndex" | "daySlot"
> & {
  /** Offset from anchor Monday (0 = Mon, 1 = Tue, … only weekdays used in expansion) */
  weekdayOffset: number;
  crewIndex: number;
  daySlot: DaySlotIndex;
};

/** Seeds expanded against a Monday YYYY-MM-DD */
export const demoJobSeeds: DemoJobSeed[] = [
  {
    title: "Residential — 6\" domestic",
    county: "Hamilton",
    weekdayOffset: 0,
    crewIndex: 0,
    daySlot: 0,
    rig: "Rig-2",
    lead: "M. Cole",
    status: "complete",
    lat: 40.0459,
    lon: -86.0086,
    driveMinutesFromYard: 42,
    feetOffDrive: 12,
    isEmergency: false,
    routingFitScore: 88,
  },
  {
    title: "Ag — stock well",
    county: "Boone",
    weekdayOffset: 1,
    crewIndex: 1,
    daySlot: 0,
    rig: "Rig-1",
    lead: "J. Ruiz",
    status: "on_site",
    lat: 39.9912,
    lon: -86.4719,
    driveMinutesFromYard: 55,
    feetOffDrive: 80,
    isEmergency: false,
    routingFitScore: 62,
  },
  {
    title: "Replacement — failed casing",
    county: "Marion",
    weekdayOffset: 2,
    crewIndex: 0,
    daySlot: 0,
    rig: "Rig-1",
    lead: "J. Ruiz",
    status: "planned",
    lat: 39.7684,
    lon: -86.1581,
    driveMinutesFromYard: 38,
    feetOffDrive: 25,
    isEmergency: false,
    routingFitScore: 74,
  },
  {
    title: "Geothermal verticals (2)",
    county: "Johnson",
    weekdayOffset: 3,
    crewIndex: 2,
    daySlot: 0,
    rig: "Rig-3",
    lead: "A. Patel",
    status: "planned",
    lat: 39.5387,
    lon: -86.087,
    driveMinutesFromYard: 61,
    feetOffDrive: 45,
    isEmergency: false,
    routingFitScore: 71,
  },
  {
    title: "Dewatering — short-term",
    county: "Lake",
    weekdayOffset: 4,
    crewIndex: 1,
    daySlot: 0,
    rig: "Rig-2",
    lead: "M. Cole",
    status: "en_route",
    lat: 41.4736,
    lon: -87.3954,
    driveMinutesFromYard: 120,
    feetOffDrive: 18,
    isEmergency: false,
    routingFitScore: 58,
  },
  {
    title: "No-water call — domestic",
    county: "Hendricks",
    weekdayOffset: 2,
    crewIndex: 2,
    daySlot: 1,
    rig: "Rig-3",
    lead: "A. Patel",
    status: "planned",
    lat: 39.7562,
    lon: -86.3978,
    driveMinutesFromYard: 48,
    feetOffDrive: 35,
    isEmergency: true,
    routingFitScore: 92,
  },
  {
    title: "New construction — 5\" PVC",
    county: "Hamilton",
    weekdayOffset: 0,
    crewIndex: 1,
    daySlot: 1,
    rig: "Rig-1",
    lead: "J. Ruiz",
    status: "planned",
    lat: 40.0878,
    lon: -85.9921,
    driveMinutesFromYard: 35,
    feetOffDrive: 22,
    isEmergency: false,
    routingFitScore: 81,
  },
  {
    title: "Commercial irrigation",
    county: "Clinton",
    weekdayOffset: 8,
    crewIndex: 0,
    daySlot: 0,
    rig: "Rig-2",
    lead: "M. Cole",
    status: "planned",
    lat: 40.2809,
    lon: -86.5103,
    driveMinutesFromYard: 95,
    feetOffDrive: 120,
    isEmergency: false,
    routingFitScore: 48,
  },
  {
    title: "Farm — deep test hole",
    county: "Tipton",
    weekdayOffset: 9,
    crewIndex: 2,
    daySlot: 0,
    rig: "Rig-3",
    lead: "A. Patel",
    status: "planned",
    lat: 40.2823,
    lon: -86.0411,
    driveMinutesFromYard: 72,
    feetOffDrive: 55,
    isEmergency: false,
    routingFitScore: 66,
  },
  {
    title: "Hold slot — county permit pending",
    county: "Madison",
    weekdayOffset: 22,
    crewIndex: 1,
    daySlot: 0,
    rig: "Rig-1",
    lead: "J. Ruiz",
    status: "planned",
    lat: 40.1059,
    lon: -85.6812,
    driveMinutesFromYard: 88,
    feetOffDrive: 30,
    isEmergency: false,
    routingFitScore: 55,
  },
];

export function addCalendarDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Monday of the ISO week containing `d` (local). */
export function mondayOfWeekContaining(d: Date): string {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x.toISOString().slice(0, 10);
}

export function expandDemoJobs(anchorMonday: string): DrillJob[] {
  return demoJobSeeds.map((seed, i) => {
    const {
      weekdayOffset,
      crewIndex,
      daySlot,
      ...rest
    } = seed;
    return {
      ...rest,
      id: `job-${anchorMonday}-${i}`,
      date: addCalendarDays(anchorMonday, weekdayOffset),
      crewIndex,
      daySlot,
    };
  });
}

export const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;

export function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
