/**
 * Web app manifest so the shell can be installed as a PWA.
 * Icons point at a local SVG. There is no store listing yet.
 */
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "STAK — Start Tiny, Accumulate Kesho",
    short_name: "STAK",
    description: "A private financial profile and a small Bitcoin habit.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3efe6",
    theme_color: "#1f4d3a",
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
