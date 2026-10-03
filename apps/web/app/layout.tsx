/**
 * Root layout for the PesaSense PWA.
 * One shell, no accounts yet. The profile on the home page is synthetic.
 */
import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { AppShell } from "../components/app-shell";
import { FirstRunRedirect } from "../components/first-run-redirect";
import { isLocale, LANGUAGE_STORAGE_KEY } from "../lib/i18n";
import { Providers } from "./providers";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

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
  themeColor: "#0D7A73",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const jar = await cookies();
  const stored = jar.get(LANGUAGE_STORAGE_KEY)?.value;
  const locale = isLocale(stored) ? stored : "en";

  return (
    <html lang={locale} className={`${jakarta.variable} h-full`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('pesasense.theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}try{var m=document.cookie.match(/(?:^|; )pesasense.language=(en|sw)/);if(m)document.documentElement.lang=m[1]}catch(e){}",
          }}
        />
      </head>
      <body className="min-h-full bg-canvas font-sans text-ink antialiased">
        <Providers locale={locale}>
          <FirstRunRedirect>
            <AppShell>{children}</AppShell>
          </FirstRunRedirect>
        </Providers>
      </body>
    </html>
  );
}
