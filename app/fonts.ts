import localFont from "next/font/local";

export const displayFont = localFont({
  src: [
    {
      path: "../public/fonts/bricolage-latin.woff2",
      weight: "200 800",
      style: "normal",
    },
  ],
  variable: "--font-bricolage",
  display: "swap",
  fallback: ["Helvetica Neue", "Arial", "sans-serif"],
  adjustFontFallback: false,
});

export const uiFont = localFont({
  src: [
    {
      path: "../public/fonts/archivo-latin.woff2",
      weight: "400 700",
      style: "normal",
    },
  ],
  variable: "--font-archivo",
  display: "swap",
  fallback: ["Helvetica Neue", "Arial", "sans-serif"],
  adjustFontFallback: false,
});

export const monoFont = localFont({
  src: [
    {
      path: "../public/fonts/ibm-plex-mono-400-latin.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/ibm-plex-mono-600-latin.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-plex-mono",
  display: "swap",
  fallback: ["SFMono-Regular", "Menlo", "Consolas", "monospace"],
  adjustFontFallback: false,
});
