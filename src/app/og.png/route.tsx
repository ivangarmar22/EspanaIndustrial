import { ImageResponse } from "next/og";
import { PlateMark } from "@/components/brand";
import { site } from "@/config/site";

export const dynamic = "force-static";

/** Link preview (/og.png) for every page without a photo of its own; see DEFAULT_SOCIAL_IMAGE. */
export function GET() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: "72px 80px",
        background: "#f4f0e8",
        color: "#1c1b19",
        borderBottom: "18px solid #9e4320",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <PlateMark id="og" size={120} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 700, letterSpacing: -1 }}>
            España&nbsp;<span style={{ color: "#9e4320" }}>Industrial</span>
          </div>
          <div style={{ fontSize: 24, letterSpacing: 4, color: "#6b6760", textTransform: "uppercase" }}>
            Atlas del patrimonio industrial
          </div>
        </div>
      </div>
      <div style={{ display: "flex", fontSize: 58, lineHeight: 1.1, maxWidth: 980, fontWeight: 600 }}>
        {site.tagline}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: 26 }}>
        <span style={{ color: "#46433e", maxWidth: 700 }}>
          Fábricas, minas, centrales, estaciones y colonias con fuentes públicas y trazables
        </span>
        <span style={{ color: "#9e4320", fontWeight: 600 }}>{site.domain}</span>
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
