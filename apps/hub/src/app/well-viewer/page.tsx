import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Well viewer — Driller Dashboard",
  description: "Redirecting to the hub drilling workspace.",
};

type Search = { [key: string]: string | string[] | undefined };

export default async function WellViewerPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  if (typeof sp.lat === "string" && sp.lat) qs.set("lat", sp.lat);
  if (typeof sp.lon === "string" && sp.lon) qs.set("lon", sp.lon);
  redirect(`/${qs.toString() ? `?${qs}` : ""}`);
}
