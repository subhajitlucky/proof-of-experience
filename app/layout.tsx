import type { Metadata, Viewport } from "next";
import { displayFont, uiFont } from "./fonts";
import "./globals.css";

const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Proof of Experience — Evidence for human-lived experience",
    template: "%s · Proof of Experience",
  },
  description:
    "Signed, witness-attested records for experiences worth trusting. An evidence and attestation layer, not a claim of absolute truth.",
  applicationName: "Proof of Experience",
  authors: [{ name: "Proof of Experience" }],
  openGraph: {
    title: "Proof of Experience",
    description:
      "Signed, witness-attested records for experiences worth trusting.",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#0a3529",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${uiFont.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full">
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
