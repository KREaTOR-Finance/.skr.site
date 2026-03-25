import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: ".skr.site",
  description: "Your Seeker name, live on the open web 🐦‍⬛",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-white antialiased">
        {children}
      </body>
    </html>
  );
}
