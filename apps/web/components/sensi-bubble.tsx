"use client";

import type { ReactNode } from "react";

type TailPosition = "left" | "bottom" | "top";

export function SensiBubble({ children, tailPosition = "left" }: { children: ReactNode; tailPosition?: TailPosition }) {
  const tailClass = tailPosition === "bottom"
    ? "-bottom-2 left-8 border-r border-b"
    : tailPosition === "top"
      ? "-top-2 left-8 border-l border-t"
      : "top-6 -left-2 border-l border-b";

  return (
    <div className="relative rounded-3xl border border-sand bg-paper px-5 py-4 shadow-card">
      <span aria-hidden="true" className={`absolute h-4 w-4 rotate-45 bg-paper ${tailClass}`} />
      <div className="relative text-sm leading-6 text-ink">{children}</div>
    </div>
  );
}
