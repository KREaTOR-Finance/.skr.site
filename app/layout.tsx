import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://skr.site");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: ".skr Studio",
    template: "%s | .skr Studio",
  },
  description: "Seeker-native .skr pages for Solana creators",
  applicationName: ".skr Studio",
  icons: {
    icon: "/icon.jpg",
    apple: "/apple-icon.jpg",
  },
  openGraph: {
    title: ".skr Studio",
    description: "Seeker-native .skr pages for Solana creators",
    images: [{ url: "/brand/skr-logo.jpg", width: 1152, height: 1728, alt: ".skr Studio chrome raven logo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: ".skr Studio",
    description: "Seeker-native .skr pages for Solana creators",
    images: ["/brand/skr-logo.jpg"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
