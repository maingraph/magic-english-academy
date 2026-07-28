import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Magic English Academy",
    short_name: "Magic English",
    description: "Курс английского, прогресс, словарь и практика в одном приложении.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#fffefa",
    theme_color: "#f29a16",
    orientation: "any",
    lang: "ru",
    categories: ["education"],
    icons: [
      {
        src: "/pwa/icon-192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/pwa/icon-512.png",
        sizes: "512x512",
        type: "image/png"
      }
    ]
  };
}
