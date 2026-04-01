export type JobStatus = "planned" | "en_route" | "on_site" | "complete";

export type ScheduledJob = {
  id: string;
  title: string;
  county: string;
  dayIndex: number;
  startSlot: number;
  spanSlots: number;
  rig: string;
  lead: string;
  status: JobStatus;
};

/** Demo week: Monday = 0 … Friday = 4 */
export const demoJobs: ScheduledJob[] = [
  {
    id: "j-101",
    title: "Residential — 6\" domestic",
    county: "Hamilton",
    dayIndex: 0,
    startSlot: 2,
    spanSlots: 3,
    rig: "Rig-2",
    lead: "M. Cole",
    status: "complete",
  },
  {
    id: "j-102",
    title: "Agricultural — stock well",
    county: "Boone",
    dayIndex: 1,
    startSlot: 1,
    spanSlots: 4,
    rig: "Rig-1",
    lead: "J. Ruiz",
    status: "on_site",
  },
  {
    id: "j-103",
    title: "Replacement — failed casing",
    county: "Marion",
    dayIndex: 2,
    startSlot: 0,
    spanSlots: 5,
    rig: "Rig-1",
    lead: "J. Ruiz",
    status: "planned",
  },
  {
    id: "j-104",
    title: "Geothermal verticals (2)",
    county: "Johnson",
    dayIndex: 3,
    startSlot: 2,
    spanSlots: 4,
    rig: "Rig-3",
    lead: "A. Patel",
    status: "planned",
  },
  {
    id: "j-105",
    title: "Dewatering — short-term",
    county: "Lake",
    dayIndex: 4,
    startSlot: 1,
    spanSlots: 3,
    rig: "Rig-2",
    lead: "M. Cole",
    status: "en_route",
  },
];

export const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;

export const slotLabels = [
  "7a",
  "8a",
  "9a",
  "10a",
  "11a",
  "12p",
  "1p",
  "2p",
  "3p",
] as const;
