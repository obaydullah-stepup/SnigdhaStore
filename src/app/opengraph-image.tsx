import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";
import { getCachedStoreName } from "@/lib/settings";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export async function generateImageMetadata() {
  const storeName = await getCachedStoreName();
  return [
    {
      id: "default",
      alt: `${storeName} — ${siteConfig.tagline}`,
      size,
      contentType,
    },
  ];
}

export default async function OpengraphImage() {
  const storeName = await getCachedStoreName();

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "0 96px",
        background: "#1f5f4b",
        color: "#fbfaf7",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 64,
          right: 96,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 112,
          height: 112,
          borderRadius: 24,
          background: "#c9a227",
          color: "#1f5f4b",
          fontSize: 64,
          fontWeight: 700,
        }}
      >
        {storeName.charAt(0).toUpperCase()}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: 28,
        }}
      >
        <div style={{ width: 56, height: 6, background: "#c9a227" }} />
        <span
          style={{
            color: "#e8d9b0",
            fontSize: 26,
            letterSpacing: 6,
            textTransform: "uppercase",
          }}
        >
          {storeName}
        </span>
      </div>

      <div
        style={{
          fontSize: 84,
          fontWeight: 700,
          lineHeight: 1.05,
          maxWidth: 900,
        }}
      >
        {storeName}
      </div>

      <div
        style={{
          marginTop: 24,
          fontSize: 36,
          lineHeight: 1.3,
          color: "#f6f1e7",
          maxWidth: 880,
        }}
      >
        {siteConfig.tagline}
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 56,
          left: 96,
          right: 96,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: "#e8d9b0",
          fontSize: 24,
        }}
      >
        <span>Nationwide cash-on-delivery</span>
        <span>{siteConfig.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
      </div>
    </div>,
    { ...size }
  );
}
