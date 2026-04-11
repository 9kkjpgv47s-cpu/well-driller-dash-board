import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Driller job — Driller Dashboard",
  description: "Redirecting to the hub drilling workspace.",
};

export default function DrillerJobPage() {
  redirect("/");
}
