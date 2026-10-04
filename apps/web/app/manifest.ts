/**
 * Installable web app manifest.
 * start_url is the overview. First-run still sends a new phone to welcome.
 * PNG icons are required for install prompts. The SVG remains a scalable extra.
 */
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "PesaSense",
    short_name: "PesaSense",
    description: "A private financial profile and a small Bitcoin habit.",
    lang: "en",
    start_url: "/overview",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f3efe4",
    theme_color: "#0D7A73",
    categories: ["finance"],
    share_target: {
      action: "/share",
      method: "POST",
      enctype: "multipart/form-data",
      params: {
        title: "title",
        text: "text",
        url: "url",
      },
    },
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
