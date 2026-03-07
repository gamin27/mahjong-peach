import { ImageResponse } from "next/og";
import { mdiCards } from "@mdi/js";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#224968",
        borderRadius: "20%",
      }}
    >
      <svg viewBox="0 0 24 24" style={{ width: "65%", height: "65%" }}>
        <path d={mdiCards} fill="white" />
      </svg>
    </div>,
    size
  );
}
