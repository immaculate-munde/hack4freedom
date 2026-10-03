"use client";

import Link from "next/link";
import { Suspense, useState } from "react";

import type { FinancialProfile } from "@pesasense/core";
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
import { useFormat, useI18n } from "../../contexts/language-context";
import { useActiveProfile } from "../../lib/use-active-profile";

const TRUST_ICONS: Record<string, string> = {
  key: "🔑",
  chart: "📊",
  phone: "📱",
};

function TrustChip({ label, icon }: { label: string; icon: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-1">
      <span className="text-2xl" role="img" aria-label={label}>
        {TRUST_ICONS[icon] ?? "✅"}
      </span>
      <span className="text-[10px] font-semibold leading-tight text-slate">
        {label}
      </span>
    </div>
  );
}

/** Calendar date from a profile window. Returns null when the field is not a real date. */
function formatWindowDate(
  iso: string,
  date: (value: Date | string | number) => string,
): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const value = new Date(year, month - 1, day);
  if (
    value.getFullYear() !== year ||
    value.getMonth() !== month - 1 ||
    value.getDate() !== day
  ) {
    return null;
  }
  return date(value);
}

function statementPeriod(
  profile: FinancialProfile,
  isDemo: boolean,
  t: (key: string, vars?: Record<string, string | number>) => string,
  date: (value: Date | string | number) => string,
): string {
  const from = formatWindowDate(profile.window.from, date);
  const to = formatWindowDate(profile.window.to, date);
  if (from && to) return t("overview.periodRange", { from, to });
  if (isDemo) return t("overview.demoStatement");
  return t("overview.statementOnPhone");
}

function OverviewContent() {
  const active = useActiveProfile();
  const { t } = useI18n();
  const { date } = useFormat();
  const [pathFocus, setPathFocus] = useState<{ id: string; token: number } | null>(null);
  if (!active.ready) {
    return <ProfileRequired />;
  }

  const { profile, profileId, isDemo, displayName: name } = active;
  const persona = isDemo
    ? t("overview.personaDemo", { name })
    : t("overview.personaPhone");

  const floor = profile.surplus.monthlyKes.floor;
  const query = isDemo && profileId === "brian" ? "?profile=brian" : "";
  const bufferFirst = showBufferFirstUx(profile) || floor <= 0;
  const period = statementPeriod(profile, isDemo, t, date);

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
          {t("overview.statementPeriod")}
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
          <span className="font-semibold">{t("overview.greeting", { name })}</span>{" "}
          {bufferFirst ? t("overview.bufferFirst") : t("overview.habitReady")}
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
          {t("overview.chamaTitle")}
        </p>
        <p className="mt-2 text-sm leading-6 text-ink">{t("overview.chamaBody")}</p>
        <Link href={`/chama${query}`} className="btn btn-secondary mt-4 inline-flex">
          {t("overview.openChama")}
        </Link>
      </section>

      <section className="grid grid-cols-3 gap-1 rounded-[20px] bg-pearl px-2 py-4 text-center">
        <TrustChip label={t("overview.trustNeverKeys")} icon="key" />
        <TrustChip label={t("overview.trustNeverTrading")} icon="chart" />
        <TrustChip label={t("overview.trustNeverLeaves")} icon="phone" />
      </section>

      <WalletActivity profileId={profileId} />
      {profileId === "amina" || profileId === "brian" ? (
        <UssdAccess profileId={profileId} />
      ) : null}
      <ProfileSync profile={profile} profileId={profileId} />

      {isDemo ? (
        <section className="card space-y-3">
          <p className="text-xs font-semibold tracking-wide text-slate uppercase">
            {t("overview.usingDemo")}
          </p>
          <p className="text-sm leading-6 text-slate">{t("overview.importDemo")}</p>
          <ImportTrigger />
          <div className="flex gap-3 pt-1 text-sm">
            <DemoProfileSwitch profileId={profileId} />
          </div>
        </section>
      ) : null}

      <p className="text-xs leading-5 text-slate">
        {persona}. {t("overview.disclaimer")}
      </p>
    </main>
  );
}

function DemoTag({ dark = false }: { dark?: boolean }) {
  const { t } = useI18n();
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${dark ? "bg-paper/15 text-paper" : "bg-pearl text-slate"}`}>
      {t("overview.demoData")}
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
