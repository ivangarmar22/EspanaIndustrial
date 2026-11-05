import { ImageResponse } from "next/og";
import { PlateMark } from "@/components/brand";

/** PNG of the full brand plate on a paper background (platforms mask their own corners). */
export function brandIcon(size: number) {
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
      <PlateMark id="icon" size={Math.round(size * 0.82)} />
    </div>,
    { width: size, height: size },
  );
}
