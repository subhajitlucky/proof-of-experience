import localFont from "next/font/local";

export const displayFont = localFont({
  src: [
    {
      path: "../public/fonts/newsreader-latin.woff2",
      weight: "200 600",
      style: "normal",
    },
  ],
  variable: "--font-newsreader",
  display: "swap",
  fallback: ["Iowan Old Style", "Georgia", "Times New Roman", "serif"],
  adjustFontFallback: false,
});

export const uiFont = localFont({
  src: [
    {
      path: "../public/fonts/manrope-latin.woff2",
      weight: "400 700",
      style: "normal",
    },
  ],
  variable: "--font-manrope",
  display: "swap",
  fallback: ["Avenir Next", "Helvetica Neue", "Arial", "sans-serif"],
  adjustFontFallback: false,
});
