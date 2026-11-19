import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Miamz",
    short_name: "Miamz",
    description:
      "Planifie tes repas, génère ta liste de courses et cuisine accompagné de Miamz. Bien manger, sans charge mentale.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FFF9E6",
    theme_color: "#4A6741",
    lang: "fr",
    orientation: "any",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
