import { notFound } from "next/navigation";
import { DesignShowcase } from "./showcase";

export const metadata = { title: "C&J design system" };

/** Rendered per-request so the production notFound() returns a real 404
 *  status instead of streaming a 200 with a 404 body. */
export const dynamic = "force-dynamic";

/** Dev-only design-system showcase — 404 in production builds. */
export default function DesignPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DesignShowcase />;
}
