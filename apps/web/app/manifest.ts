import type { MetadataRoute } from "next"

/**
 * Web app manifest: lets Bible Plan be installed on the home screen (and, on
 * iPhone, receive push notifications once installed). The app opens on
 * Today, which sends a signed-out visitor to the sign-in page.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bible Plan",
    short_name: "Bible Plan",
    description:
      "Read the Bible at your own pace, day after day. / Lisez la Bible à votre rythme, jour après jour.",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    // Cream of the light theme, night blue of the brand for the status bar.
    background_color: "#fbf6ea",
    theme_color: "#10284a",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
