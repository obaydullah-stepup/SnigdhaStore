import type { MetadataRoute } from "next";
import { siteConfig, resolveBrand } from "@/config/site";
import { getCachedStoreName } from "@/lib/settings";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  // Read from the database so renaming the store updates the installed
  // app's home-screen label too.
  const storeName = await getCachedStoreName();

  return {
    name: storeName,
    short_name: storeName,
    description: resolveBrand(siteConfig.description, storeName),
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#10b981",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
