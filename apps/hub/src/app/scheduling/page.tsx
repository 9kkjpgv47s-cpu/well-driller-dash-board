import type { Metadata } from "next";
import { SchedulingBoard } from "@/components/scheduling/SchedulingBoard";

export const metadata: Metadata = {
  title: "Office — Driller Dashboard",
  description:
    "Crew week/month board, jobs per day, emergency inserts, and job-scoped multi-source weather.",
};

export default function SchedulingPage() {
  return <SchedulingBoard />;
}
