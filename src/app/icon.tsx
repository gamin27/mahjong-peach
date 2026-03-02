import { ImageResponse } from "next/og";
import { mdiCards } from "@mdi/js";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon() {
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
      <svg
        viewBox="0 0 24 24"
        style={{ width: "65%", height: "65%", fill: "white" }}
      >
        <path d={mdiCards} />
      </svg>
    </div>,
    size
  );
}
