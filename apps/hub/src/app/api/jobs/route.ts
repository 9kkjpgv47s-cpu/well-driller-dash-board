import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";
import { createJob, listJobs } from "@/lib/jobs-store";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

function extForType(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

async function saveUploadedImage(file: File): Promise<string> {
  if (file.size > MAX_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }
  const type = file.type || "";
  if (!ALLOWED.has(type)) {
    throw new Error("BAD_TYPE");
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const id = crypto.randomUUID();
  const name = `${id}.${extForType(type)}`;
  const dir = join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, name), buf);
  return `/uploads/${name}`;
}

export async function GET() {
  return NextResponse.json({ jobs: listJobs() });
}

export async function POST(request: Request) {
  const ct = request.headers.get("content-type") || "";

  let title: string;
  let driveAddress: string;
  let distanceOffDrive: string;
  let lat: number;
  let lon: number;
  let notes: string;
  let sitePhotoUrl: string | null = null;

  try {
    if (ct.includes("multipart/form-data")) {
      const form = await request.formData();
      title = String(form.get("title") ?? "").trim();
      driveAddress = String(form.get("driveAddress") ?? "").trim();
      distanceOffDrive = String(form.get("distanceOffDrive") ?? "").trim();
      notes = String(form.get("notes") ?? "").trim();
      lat = Number(form.get("lat"));
      lon = Number(form.get("lon"));
      const file = form.get("sitePhoto");
      if (file instanceof File && file.size > 0) {
        try {
          sitePhotoUrl = await saveUploadedImage(file);
        } catch (e) {
          const msg =
            e instanceof Error && e.message === "FILE_TOO_LARGE"
              ? "Photo too large (max 5 MB)"
              : e instanceof Error && e.message === "BAD_TYPE"
                ? "Photo must be JPEG, PNG, or WebP"
                : "Could not save photo";
          return NextResponse.json({ error: msg }, { status: 400 });
        }
      }
    } else {
      const body = (await request.json()) as Record<string, unknown>;
      title = String(body.title ?? "").trim();
      driveAddress = String(body.driveAddress ?? "").trim();
      distanceOffDrive = String(body.distanceOffDrive ?? "").trim();
      notes = String(body.notes ?? "").trim();
      lat = Number(body.lat);
      lon = Number(body.lon);
      if (typeof body.sitePhotoUrl === "string" && body.sitePhotoUrl.startsWith("/uploads/")) {
        sitePhotoUrl = body.sitePhotoUrl;
      }
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!title || !driveAddress) {
    return NextResponse.json(
      { error: "Title and drive address are required" },
      { status: 400 },
    );
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json(
      { error: "Valid latitude and longitude are required" },
      { status: 400 },
    );
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ error: "Coordinates out of range" }, { status: 400 });
  }

  const job = createJob({
    title,
    driveAddress,
    distanceOffDrive,
    lat,
    lon,
    notes,
    sitePhotoUrl,
  });

  return NextResponse.json({ job }, { status: 201 });
}
