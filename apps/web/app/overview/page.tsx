"use client";

import Link from "next/link";
import { Suspense, useState } from "react";

import { PAST_PERFORMANCE_DISCLAIMER, type FinancialProfile } from "@pesasense/core";
import { DemoProfileSwitch } from "../../components/demo-profile-switch";
import { ProfileRequired } from "../../components/profile-required";
import { ProfileSync } from "../../components/profile-sync";
import { SensiAvatar } from "../../components/sensi-avatar";
import { UssdAccess } from "../../components/ussd-access";
import { WalletActivity } from "../../components/wallet-activity";
import { ImportTrigger } from "../../components/import-trigger";
import { showBufferFirstUx } from "../../lib/buffer-gate";
import { LifeMarkers } from "../../components/life-markers";
import { buildMoneyStops, MoneyMap } from "../../components/money-map";
import { useActiveProfile } from "../../lib/use-active-profile";

const TRUST_ICONS: Record<string, string> = {
  key: "🔑",
  chart: "📊",
  phone: "📱",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function TrustChip({ label, icon }: { label: string; icon: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-1">
      <span className="text-2xl" role="img" aria-label={icon}>
        {TRUST_ICONS[icon] ?? "✅"}
      </span>
      <span className="text-[10px] font-semibold leading-tight text-slate">
        {label}
      </span>
    </div>
  );
}

/** Calendar date from a profile window. Returns null when the field is not a real date. */
function formatWindowDate(iso: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const monthName = MONTHS[month - 1];
  if (!monthName || day < 1 || day > 31) return null;
  return `${day} ${monthName} ${year}`;
}

function statementPeriod(profile: FinancialProfile, isDemo: boolean): string {
  const from = formatWindowDate(profile.window.from);
  const to = formatWindowDate(profile.window.to);
  if (from && to) return `${from} – ${to}`;
  if (isDemo) return "Demo statement";
  return "From the statement on this phone";
}

function OverviewContent() {
  const active = useActiveProfile();
  const [pathFocus, setPathFocus] = useState<{ id: string; token: number } | null>(null);
  if (!active.ready) {
    return <ProfileRequired />;
  }

  const { profile, profileId, isDemo, displayName: name } = active;
  const persona = isDemo ? `${name} (invented demo)` : "Your profile on this phone";

  const floor = profile.surplus.monthlyKes.floor;
  const query = isDemo && profileId === "brian" ? "?profile=brian" : "";
  const bufferFirst = showBufferFirstUx(profile) || floor <= 0;
  const period = statementPeriod(profile, isDemo);

  function openPromisedOnPath() {
    const stop = buildMoneyStops(profile).find((item) => item.id.startsWith("commitment-"));
    if (!stop) return;
    setPathFocus({ id: stop.id, token: Date.now() });
    document.getElementById("month-path")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  return (
    <main className="flex w-full flex-col gap-8 pb-24 md:gap-4 md:pb-0">
      <header className="mb-2 md:mb-0">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-slate uppercase">
          Statement period
        </p>
        <p className="mt-1 text-sm font-semibold text-ink">{period}</p>
        {isDemo ? (
          <p className="mt-2">
            <DemoTag />
          </p>
        ) : null}
      </header>

      <section className="flex items-center gap-3 rounded-[20px] border border-mint/40 bg-mint/35 px-5 py-4 shadow-card">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mint">
          <SensiAvatar size="sm" mood="happy" />
        </span>
        <p className="text-sm leading-5 text-ink">
          <span className="font-semibold">Habari {name} 👋</span>{" "}
          {bufferFirst
            ? "The buffer comes first. This history is not ready for a Bitcoin habit yet."
            : "Here is the picture from this statement, then what a habit would mean."}
        </p>
      </section>

      <MoneyMap profile={profile} isDemo={isDemo} focusRequest={pathFocus} />

      <LifeMarkers
        profile={profile}
        isDemo={isDemo}
        habitHref={`/habit${query}`}
        onOpenPromisedStop={openPromisedOnPath}
      />

      <section className="rounded-[20px] bg-white p-5 shadow-card">
        <p className="text-[11px] font-semibold tracking-[0.12em] text-slate uppercase">
          Chama
        </p>
        <p className="mt-2 text-sm leading-6 text-ink">
          The circle records who pays whom this round. Each person pays from a
          wallet they control. PesaSense never holds the group&apos;s sats.
        </p>
        <Link href={`/chama${query}`} className="btn btn-secondary mt-4 inline-flex">
          Open chama
        </Link>
      </section>

      <section className="grid grid-cols-3 gap-1 rounded-[20px] bg-pearl px-2 py-4 text-center">
        <TrustChip label="Never hold keys" icon="key" />
        <TrustChip label="Never push trading" icon="chart" />
        <TrustChip label="Never leaves phone" icon="phone" />
      </section>

      <WalletActivity profileId={profileId} />
      {profileId === "amina" || profileId === "brian" ? (
        <UssdAccess profileId={profileId} />
      ) : null}
      <ProfileSync profile={profile} profileId={profileId} />

      {isDemo ? (
        <section className="card space-y-3">
          <p className="text-xs font-semibold tracking-wide text-slate uppercase">
            Using demo data
          </p>
          <p className="text-sm leading-6 text-slate">
            Import your M-Pesa history to see your real financial picture.
          </p>
          <ImportTrigger />
          <div className="flex gap-3 pt-1 text-sm">
            <DemoProfileSwitch profileId={profileId} />
          </div>
        </section>
      ) : null}

      <p className="text-xs leading-5 text-slate">
        {persona}. {PAST_PERFORMANCE_DISCLAIMER}
      </p>
    </main>
  );
}

function DemoTag({ dark = false }: { dark?: boolean }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${dark ? "bg-paper/15 text-paper" : "bg-pearl text-slate"}`}>
      Demo data
    </span>
  );
}

export default function OverviewPage() {
  return (
    <Suspense>
      <OverviewContent />
    </Suspense>
  );
}
