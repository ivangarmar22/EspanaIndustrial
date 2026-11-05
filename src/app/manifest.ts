import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { withBase } from "@/lib/base-path";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: site.name,
    description: site.description,
    lang: "es",
    start_url: withBase("/"),
    display: "browser",
    background_color: "#f4f0e8",
    theme_color: "#f4f0e8",
    icons: [
      { src: withBase("/icon-192.png"), sizes: "192x192", type: "image/png" },
      { src: withBase("/icon-512.png"), sizes: "512x512", type: "image/png" },
    ],
  };
}
