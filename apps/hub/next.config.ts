import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Pin NFT tracing to this app directory so builds stay correct after the repo is moved
  // out of any parent project (avoids stale absolute roots in `.next`).
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
