"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

type GateStatus = "checking" | "pass";

export function FirstRunRedirect({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<GateStatus>("checking");
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/welcome") {
      setStatus("pass");
      return;
    }

    if (localStorage.getItem("hasSeenWelcome") === "true") {
      setStatus("pass");
    } else {
      router.replace("/welcome");
    }
  }, [pathname, router]);

  if (status === "checking") {
    return null;
  }

  return <>{children}</>;
}
