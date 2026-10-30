import type { NextConfig } from "next";

/**
 * Static export for GitHub Pages: every page is pre-rendered at build time and
 * served as plain files, so there is no server (no Server Actions, request
 * headers, redirects or image optimisation).
 */
const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  // GitHub Pages serves /ruta/index.html for /ruta/.
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
