/**
 * First-visit gate.
 *
 * The welcome flag is a local preference, not the financial profile.
 * Open routes render immediately. Other routes wait on a linen screen,
 * then either show the app or go to welcome.
 */
"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

const WELCOME_FLAG = "hasSeenWelcome";

/** Routes a first-time visitor may open before they tap Get started. */
const OPEN_PREFIXES = ["/welcome", "/onboarding", "/onboard", "/trust"];

function isOpenPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return OPEN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Sends a first visit to welcome without blanking the document. */
export function FirstRunRedirect({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const open = isOpenPath(pathname);
  const [ready, setReady] = useState(open);

  useEffect(() => {
    if (open) {
      setReady(true);
      return;
    }

    if (localStorage.getItem(WELCOME_FLAG) === "true") {
      setReady(true);
      return;
    }

    router.replace("/welcome");
  }, [open, router]);

  if (!ready) {
    return <div className="min-h-screen bg-paper" aria-busy="true" />;
  }

  return children;
}
