/**
 * Root layout for the PesaSense PWA.
 * One shell, no accounts yet. The profile on the home page is synthetic.
 */
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "PesaSense",
  description:
    "A private financial profile and a small Bitcoin habit. Education, not financial advice.",
  applicationName: "PesaSense",
  appleWebApp: {
    capable: true,
    title: "PesaSense",
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
      <body className="min-h-screen bg-paper text-ink antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
