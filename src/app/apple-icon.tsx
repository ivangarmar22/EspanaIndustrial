import { ImageResponse } from "next/og";
import { PlateMark } from "@/components/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export const dynamic = "force-static";

// Apple masks its own rounded corners, so the plate sits on a full-bleed paper background.
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#f4f0e8",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <PlateMark id="apple" size={150} />
    </div>,
    size,
  );
}
