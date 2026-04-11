import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Optimization — Driller Dashboard",
  description: "Redirecting to the hub drilling workspace.",
};

export default function OptimizationPage() {
  redirect("/");
}
