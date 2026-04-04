export type JobRecord = {
  id: string;
  createdAt: string;
  title: string;
  driveAddress: string;
  /** Free text: e.g. "120 ft NE of mailbox" */
  distanceOffDrive: string;
  lat: number;
  lon: number;
  notes: string;
  sitePhotoUrl: string | null;
};

const jobs = new Map<string, JobRecord>();

export function createJob(record: Omit<JobRecord, "id" | "createdAt">): JobRecord {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const full: JobRecord = { id, createdAt, ...record };
  jobs.set(id, full);
  return full;
}

export function getJob(id: string): JobRecord | undefined {
  return jobs.get(id);
}

export function listJobs(): JobRecord[] {
  return [...jobs.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
