import localFont from "next/font/local";

export const displayFont = localFont({
  src: [
    {
      path: "../public/fonts/fraunces-latin.woff2",
      weight: "300 600",
      style: "normal",
    },
  ],
  variable: "--font-fraunces",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
  adjustFontFallback: false,
});

export const uiFont = localFont({
  src: [
    {
      path: "../public/fonts/public-sans-latin.woff2",
      weight: "400 600",
      style: "normal",
    },
  ],
  variable: "--font-public",
  display: "swap",
  fallback: ["Helvetica Neue", "Arial", "sans-serif"],
  adjustFontFallback: false,
});
