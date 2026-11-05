import type { NextConfig } from "next";
import { IMAGE_WIDTHS } from "./src/lib/media";

/**
 * Static export: every page is pre-rendered at build time and served as plain
 * files, so there is no server (no Server Actions, request headers or redirects).
 */
const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  // Static hosts serve /ruta/index.html for /ruta/.
  trailingSlash: true,
  // Photos are resized ahead of time (npm run media:optimize); the loader picks the right size.
  images: {
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    imageSizes: [],
    deviceSizes: IMAGE_WIDTHS,
  },
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
