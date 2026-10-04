"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { CustomerRail } from "../../components/customer-rail";
import { DemoProfileSwitch } from "../../components/demo-profile-switch";
import { ImportTrigger } from "../../components/import-trigger";
import { InstallAppCard } from "../../components/pwa-experience";
import { LanguageSwitcher } from "../../components/language-switcher";
import { PageFrame } from "../../components/page-frame";
import { ProfileSync } from "../../components/profile-sync";
import { ThemeToggle } from "../../components/theme-toggle";
import { useBreezWallet } from "../../contexts/breez-wallet-context";
import { useFormat, useI18n } from "../../contexts/language-context";
import { useActiveProfile } from "../../lib/use-active-profile";

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const { t } = useI18n();
  const { kes, number } = useFormat();
  const wallet = useBreezWallet();
  const active = useActiveProfile();
  const [signingOut, setSigningOut] = useState(false);
  const walletReady = wallet.status === "ready" && Boolean(wallet.lightningAddress);
  const plan = active.ready ? active.profile.investmentPlan : null;

  return (
    <PageFrame title={t("settings.title")} description={t("settings.description")} backHref="/">
      <div className="space-y-4">
        <section>
          <h2 className="font-serif text-lg text-pine">{t("settings.thisPhone")}</h2>
          <div className="mt-3">
            <CustomerRail />
          </div>
        </section>

        <section className="card flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-serif text-lg text-pine">{t("settings.language")}</h2>
            <p className="mt-1 text-sm leading-6 text-ink/70">{t("settings.languageHint")}</p>
          </div>
          <LanguageSwitcher />
        </section>

        <InstallAppCard />

        <section className="card flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-serif text-lg text-pine">{t("settings.appearance")}</h2>
            <p className="mt-1 text-sm leading-6 text-ink/70">{t("settings.appearanceHint")}</p>
          </div>
          <ThemeToggle />
        </section>

        {active.ready ? (
          <section className="card flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="font-serif text-lg text-pine">{t("nav.habit")}</h2>
              <p className="mt-1 text-sm leading-6 text-ink/70">
                {plan
                  ? t("settings.habitLine", {
                      amount: kes(plan.amountKes),
                      cadence:
                        plan.cadence === "weekly" ? t("common.weekly") : t("common.monthly"),
                    })
                  : t("nav.noHabit")}
              </p>
            </div>
            <Link href="/habit" className="btn btn-secondary inline-flex">
              {t("nav.review")}
            </Link>
          </section>
        ) : null}

        <section className="card">
          <h2 className="font-serif text-lg text-pine">{t("nav.wallet")}</h2>
          <p className="mt-1 text-sm leading-6 text-ink/70">{t("wallet.description")}</p>
          {walletReady ? (
            <>
              <p className="mt-3 break-all font-mono text-xs text-ink">{wallet.lightningAddress}</p>
              <p className="mt-2 text-sm font-medium text-pine">
                {t("wallet.balanceLine", { sats: number(wallet.balanceSats) })}
              </p>
              <button
                type="button"
                className="btn btn-ghost mt-4 w-full sm:w-auto"
                disabled={signingOut}
                onClick={() => {
                  setSigningOut(true);
                  void wallet.signOutWallet().finally(() => setSigningOut(false));
                }}
              >
                {t("wallet.signOut")}
              </button>
            </>
          ) : (
            <p className="mt-2 text-sm leading-6 text-ink/70">{t("settings.walletClosed")}</p>
          )}
          <Link href="/wallet" className="btn btn-secondary mt-4 inline-flex">
            {t("settings.openWallet")}
          </Link>
        </section>

        <section className="card">
          <h2 className="font-serif text-lg text-pine">{t("settings.data")}</h2>
          <p className="mt-1 text-sm leading-6 text-ink/70">{t("import.neverLeave")}</p>
          {active.ready && active.isDemo ? (
            <div className="mt-3 space-y-2">
              <p className="text-sm leading-6 text-ink/70">{t("overview.importDemo")}</p>
              <DemoProfileSwitch profileId={active.profileId} />
            </div>
          ) : null}
          <div className="mt-4">
            <ImportTrigger />
          </div>
        </section>

        {active.ready ? (
          <ProfileSync profile={active.profile} profileId={active.profileId} />
        ) : null}

        <section className="card">
          <h2 className="font-serif text-lg text-pine">{t("settings.privacy")}</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/80">
            <li>{t("overview.trustNeverKeys")}</li>
            <li>{t("overview.trustNeverTrading")}</li>
            <li>{t("overview.trustNeverLeaves")}</li>
          </ul>
          <Link
            href="/trust"
            className="mt-4 inline-flex font-semibold text-pine underline underline-offset-4"
          >
            {t("trust.notice")}
          </Link>
        </section>
      </div>
    </PageFrame>
  );
}
