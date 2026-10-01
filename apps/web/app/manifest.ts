/**
 * Web app manifest so the shell can be installed as a PWA.
 * Icons point at a local SVG. There is no store listing yet.
 */
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PesaSense",
    short_name: "PesaSense",
    description: "A private financial profile and a small Bitcoin habit.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF8F5",
    theme_color: "#0D7A73",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
