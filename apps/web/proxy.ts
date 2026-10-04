import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Fallback when a share POST is not caught by the service worker.
 * The body is not read and not stored. The page tells the person to paste.
 */
export function proxy(request: NextRequest) {
  if (request.method === "POST" && request.nextUrl.pathname === "/share") {
    const next = request.nextUrl.clone();
    next.pathname = "/share";
    next.search = "local=0";
    return NextResponse.redirect(next, 303);
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/share",
};
