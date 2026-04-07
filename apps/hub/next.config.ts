import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /** Parent repo has its own package-lock.json for Vercel; keep tracing scoped to monorepo root */
  outputFileTracingRoot: path.join(process.cwd(), ".."),
};

export default nextConfig;
