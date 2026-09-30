/**
 * Root layout for the STAK PWA.
 * One shell, no accounts yet. The profile on the home page is synthetic.
 */
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "STAK — Start Tiny, Accumulate Kesho",
  description:
    "A private financial profile and a small Bitcoin habit. Education, not financial advice.",
  applicationName: "STAK",
  appleWebApp: {
    capable: true,
    title: "STAK",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#1f4d3a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-paper text-ink antialiased">{children}</body>
    </html>
  );
}
