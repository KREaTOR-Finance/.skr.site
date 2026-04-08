import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: ".skr Studio",
  description: "Seeker-native .skr studio with fully on-chain publish and premium unlock",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
