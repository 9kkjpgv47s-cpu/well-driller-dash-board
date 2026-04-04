"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

export function BuildJobForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [driveAddress, setDriveAddress] = useState("");
  const [distanceOffDrive, setDistanceOffDrive] = useState("");
  const [lat, setLat] = useState("39.7684");
  const [lon, setLon] = useState("-86.1581");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onFileChange = useCallback((f: File | null) => {
    setFile(f);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (f) {
      setPreviewUrl(URL.createObjectURL(f));
    }
  }, [previewUrl]);

  const submit = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const form = new FormData();
      form.set("title", title.trim());
      form.set("driveAddress", driveAddress.trim());
      form.set("distanceOffDrive", distanceOffDrive.trim());
      form.set("lat", lat.trim());
      form.set("lon", lon.trim());
      form.set("notes", notes.trim());
      if (file) {
        form.set("sitePhoto", file);
      }
      const res = await fetch("/api/jobs", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as { job?: { id: string }; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not save job");
        return;
      }
      if (data.job?.id) {
        router.push(`/jobs/${data.job.id}`);
        router.refresh();
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [title, driveAddress, distanceOffDrive, lat, lon, notes, file, router]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-[var(--muted)]">
              Job title
            </span>
            <input
              type="text"
              required
              placeholder="e.g. Smith — new domestic well"
              className="input-field"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-[var(--muted)]">
              Drive / road address
            </span>
            <input
              type="text"
              required
              placeholder="Where you park the rig"
              className="input-field"
              value={driveAddress}
              onChange={(e) => setDriveAddress(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-[var(--muted)]">
              Distance off drive
            </span>
            <input
              type="text"
              placeholder="e.g. 200 ft west of mailbox, back field"
              className="input-field"
              value={distanceOffDrive}
              onChange={(e) => setDistanceOffDrive(e.target.value)}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-[var(--muted)]">
                Latitude
              </span>
              <input
                type="number"
                step="any"
                required
                className="input-field font-mono text-sm"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-[var(--muted)]">
                Longitude
              </span>
              <input
                type="number"
                step="any"
                required
                className="input-field font-mono text-sm"
                value={lon}
                onChange={(e) => setLon(e.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-[var(--muted)]">
              Notes for the crew
            </span>
            <textarea
              rows={6}
              placeholder="Access, dogs, septic, preferred rig path, customer requests…"
              className="input-field min-h-[140px] resize-y"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>

          <div>
            <span className="mb-1.5 block text-xs font-medium text-[var(--muted)]">
              Site photo
            </span>
            <label className="surface-muted flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] px-4 py-8 transition hover:border-[var(--accent)]/50 hover:bg-white/40 dark:hover:bg-white/5">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
              />
              <span className="text-sm font-medium text-[var(--foreground)]">
                Drop a photo or tap to upload
              </span>
              <span className="mt-1 text-center text-xs text-[var(--muted)]">
                JPEG, PNG, or WebP · max 5 MB
              </span>
            </label>
            {previewUrl ? (
              <div
                className="mt-3 h-56 w-full rounded-xl bg-[var(--surface-muted)] bg-cover bg-center ring-1 ring-[var(--border)]"
                style={{ backgroundImage: `url(${previewUrl})` }}
                role="img"
                aria-label="Photo preview"
              />
            ) : null}
          </div>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={loading}
          className="btn-primary"
        >
          {loading ? "Saving…" : "Save job & open driller brief"}
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => router.push("/scheduling")}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
