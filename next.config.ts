import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Map tiles: OpenFreeMap (vector basemap) and IGN (official WMTS/WMS layers).
const MAP_HOSTS = ["https://tiles.openfreemap.org", "https://www.ign.es"];

const csp = [
  "default-src 'self'",
  // Next.js injects inline bootstrap scripts; dev mode additionally needs eval for HMR.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${MAP_HOSTS.join(" ")}`,
  "font-src 'self'",
  `connect-src 'self' ${MAP_HOSTS.join(" ")}${isDev ? " ws:" : ""}`,
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    // Contribution photos are limited to 8 MB in the action itself; this leaves room for the other fields.
    serverActions: { bodySizeLimit: "9mb" },
  },
  async redirects() {
    return [
      { source: "/acerca", destination: "/colabora", permanent: true },
      { source: "/contribuir", destination: "/colabora#proponer", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
