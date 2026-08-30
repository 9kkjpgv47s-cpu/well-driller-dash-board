import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Pin NFT tracing to this app directory so builds stay correct after the repo is moved
  // out of any parent project (avoids stale absolute roots in `.next`).
  outputFileTracingRoot: path.join(__dirname),
  async headers() {
    return [
      {
        // Legacy full chunks — content-addressed by ETL, never change in place.
        source: "/well-viewer/dnr_wells_chunk_:idx(\\d+).csv.gz",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Base chunks (no lithology_json) — immutable ETL artifacts.
        source: "/well-viewer/dnr_wells_base_chunk_:idx(\\d+).csv.gz",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Litho sidecar chunks — immutable ETL artifacts.
        source: "/well-viewer/dnr_wells_litho_chunk_:idx(\\d+).csv.gz",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Litho sidecar parts — immutable ETL artifacts.
        source: "/well-viewer/litho_parts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Precomputed area grid — immutable ETL artifact.
        source: "/well-viewer/area_grid.json.gz",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/scheduling",
        destination: "/",
        permanent: true,
      },
      {
        source: "/scheduling/:path*",
        destination: "/",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
