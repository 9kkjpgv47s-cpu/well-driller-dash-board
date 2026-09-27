import { notFound } from "next/navigation";
import { DesignShowcase } from "./showcase";

export const metadata = { title: "C&J design system" };

/** Dev-only design-system showcase — 404 in production builds. */
export default function DesignPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DesignShowcase />;
}
