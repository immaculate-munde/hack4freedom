"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV = [
  { href: "/", label: "Surplus", match: (p: string) => p === "/" },
  { href: "/invest", label: "Invest", match: (p: string) => p.startsWith("/invest") },
  { href: "/wallet", label: "Wallet", match: (p: string) => p.startsWith("/wallet") },
] as const;

function NavLink({
  href,
  label,
  active,
  className,
}: {
  href: string;
  label: string;
  active: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`${className ?? ""} ${
        active
          ? "bg-pine text-paper shadow-sm"
          : "text-ink/75 hover:bg-sand/80 hover:text-pine"
      }`}
      aria-current={active ? "page" : undefined}
    >
      {label}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";

  return (
    <div className="app-shell">
      <aside
        className="app-sidebar hidden lg:flex"
        aria-label="Primary"
      >
        <div className="flex flex-col gap-8 p-8">
          <div>
            <p className="font-serif text-2xl tracking-tight text-pine">PesaSense</p>
            <p className="mt-1 text-xs leading-5 text-ink/60">
              Private surplus. Small Bitcoin saves.
            </p>
          </div>
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                active={item.match(pathname)}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
              />
            ))}
          </nav>
          <p className="mt-auto text-[11px] leading-5 text-ink/45">
            Education, not financial advice. Funds stay in your wallet.
          </p>
        </div>
      </aside>

      <div className="app-main-column">
        <header className="app-mobile-header lg:hidden">
          <p className="font-serif text-lg text-pine">PesaSense</p>
          <p className="text-[11px] font-medium tracking-wide text-moss uppercase">
            On this device
          </p>
        </header>

        <div className="app-content">{children}</div>

        <nav
          className="app-mobile-nav lg:hidden safe-bottom"
          aria-label="Primary"
        >
          {NAV.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              active={item.match(pathname)}
              className="flex flex-1 items-center justify-center rounded-xl py-2.5 text-xs font-semibold transition-colors"
            />
          ))}
        </nav>
      </div>
    </div>
  );
}
