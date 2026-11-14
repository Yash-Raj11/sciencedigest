import type { MetadataRoute } from "next";
import { PAGE_COLOUR } from "@/lib/theme";

/** Makes the site installable to a phone's home screen ("Add to Home Screen"). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Science Digest",
    short_name: "Digest",
    description: "Clinical research in five-minute reads, with a protocol you can track.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: PAGE_COLOUR.dark,
    theme_color: PAGE_COLOUR.dark,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
