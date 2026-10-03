"use client";

import { useEffect, useRef, useState } from "react";
import {
  createDemoChamaSisters,
  isDemoLightningAddress,
  optInReliabilityBadge,
  parseChamaCircle,
  payAndRecord,
  recordOwnContribution,
  roundView,
  setOwnLightningAddress,
  type ChamaCircle,
} from "@pesasense/nostr";
import { PageFrame } from "../../components/page-frame";
import { useFormat, useI18n } from "../../contexts/language-context";
import { useBreezWallet } from "../../contexts/breez-wallet-context";
import {
  readStoredOnboardingChama,
  type OnboardingChama,
} from "../../lib/onboarding-chama";

const STORAGE_KEY = "pesasense.chama.v1";

const CHAMA_ERRORS: Record<string, string> = {
  "Use a Lightning address you control, like name@wallet.com.": "chama.errors.ownAddress",
  "Only a member of this chama can do that.": "chama.errors.onlyMember",
  "There is no open round.": "chama.errors.noOpenRound",
  "This round has payments to more than one address.": "chama.errors.manyAddresses",
  "The member receiving this round does not pay into it.": "chama.errors.recipientDoesNotPay",
  "This contribution is already recorded.": "chama.errors.already",
  "This payment would return to your own Lightning address.": "chama.errors.ownReturn",
  "This round changed before the payment could be recorded.": "chama.errors.roundChanged",
  "This chama has no members to rotate to.": "chama.errors.noMembers",
  "This recipient uses a real Lightning address. Pay from your own wallet.": "chama.errors.realAddress",
  "A Lightning payment needs a positive whole sats amount.": "chama.errors.positiveSats",
  "This is a demo address. It cannot receive sats. Record the demo contribution instead.":
    "chama.errors.demoAddress",
  "That Lightning address already belongs to another member.": "chama.errors.taken",
  "A reliability note is available after a round finishes.": "chama.errors.noteAfterRound",
  "Enter a positive sats amount.": "walletSetup.positiveSats",
  "Could not open wallet.": "walletSetup.openFailed",
  "Pay from the wallet that matches this member's Lightning address.": "chama.matchWallet",
  "Could not record this contribution.": "chama.recordFailed",
  "The payment did not finish.": "chama.payFailed",
  "Could not save that address.": "chama.saveFailed",
  "Could not use this wallet address.": "chama.useFailed",
  "Could not save that note.": "chama.noteFailed",
};

export function ChamaFlow() {
  const { t } = useI18n();
  const { kes, number } = useFormat();
  const wallet = useBreezWallet();
  const [circle, setCircle] = useState<ChamaCircle | null>(null);
  const [actorId, setActorId] = useState("amina");
  const [error, setError] = useState<string | null>(null);
  const [addressDraft, setAddressDraft] = useState("");
  const [quoteSats, setQuoteSats] = useState<number | null>(null);
  const [quoteFailed, setQuoteFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [onboardingChama, setOnboardingChama] = useState<OnboardingChama | null>(null);
  const payLock = useRef(false);

  function explain(err: unknown, fallbackKey: string): string {
    if (!(err instanceof Error)) return t(fallbackKey);
    const message = err.message.trim();
    if (!message) return t(fallbackKey);
    if (!/\s/.test(message)) {
      const translated = t(message);
      if (translated !== message) return translated;
    }
    const key = CHAMA_ERRORS[message];
    if (key) return t(key);
    return t(fallbackKey);
  }

  useEffect(() => {
    setOnboardingChama(readStoredOnboardingChama());
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      setCircle(createDemoChamaSisters());
      return;
    }
    try {
      const parsed = parseChamaCircle(JSON.parse(saved) as unknown);
      setCircle(parsed ?? createDemoChamaSisters());
    } catch {
      setCircle(createDemoChamaSisters());
    }
  }, []);

  useEffect(() => {
    if (!circle) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(circle));
  }, [circle]);

  useEffect(() => {
    const amountKes = circle?.monthlyContributionKes;
    if (!amountKes) return;
    let cancelled = false;
    void fetch("/api/onramp/quote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amountKes }),
    })
      .then(async (res) => {
        const data = (await res.json()) as { estimatedSats?: number };
        if (cancelled) return;
        if (res.ok && typeof data.estimatedSats === "number" && Number.isFinite(data.estimatedSats)) {
          setQuoteSats(Math.round(data.estimatedSats));
          setQuoteFailed(false);
          return;
        }
        setQuoteSats(null);
        setQuoteFailed(true);
      })
      .catch(() => {
        if (!cancelled) {
          setQuoteSats(null);
          setQuoteFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [circle?.monthlyContributionKes]);

  if (!circle) {
    return (
      <PageFrame title={t("chama.title")} description={t("chama.loadingCircle")}>
        <section className="card text-sm text-ink/70">{t("chama.loading")}</section>
      </PageFrame>
    );
  }

  const current = circle;
  let view: ReturnType<typeof roundView> | null = null;
  try {
    view = roundView(current);
  } catch {
    view = null;
  }
  if (!view) {
    return (
      <PageFrame title={t("chama.title")} description={t("chama.unreadable")}>
        <section className="card">
          <p className="text-sm leading-6 text-ink/75">{t("chama.incomplete")}</p>
          <button
            type="button"
            className="btn btn-primary mt-4"
            onClick={() => {
              const fresh = createDemoChamaSisters();
              window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
              setCircle(fresh);
              setActorId("amina");
              setError(null);
              setAddressDraft("");
            }}
          >
            {t("chama.reset")}
          </button>
        </section>
      </PageFrame>
    );
  }
  const demoDestination = isDemoLightningAddress(view.payDestination);
  const satsToSend = quoteSats !== null && quoteSats > 0 ? quoteSats : null;
  const actor = current.members.find((member) => member.id === actorId) ?? current.members[0];
  const ownsThisWallet =
    wallet.status === "ready" &&
    !!wallet.lightningAddress &&
    actor?.lightningAddress === wallet.lightningAddress;
  const actorRow = actor ? view.rows.find((row) => row.member.id === actor.id) : undefined;
  const badge = actor
    ? current.badgeOptIns.find((optIn) => optIn.memberId === actor.id)
    : undefined;
  const actorPayment = actor
    ? current.contributions.find(
        (record) => record.cycleId === view.cycle.id && record.payerId === actor.id,
      )
    : undefined;

  function persist(next: ChamaCircle) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setCircle(next);
    setError(null);
  }

  function onRecordDemo() {
    if (!actor || busy || payLock.current) return;
    try {
      persist(recordOwnContribution(current, actor.id, new Date().toISOString()));
    } catch (err) {
      setError(explain(err, "chama.recordFailed"));
    }
  }

  async function onPayFromWallet() {
    if (!actor || busy || payLock.current || !satsToSend) return;
    if (wallet.status !== "ready" || wallet.lightningAddress !== actor.lightningAddress) {
      setError(t("chama.matchWallet"));
      return;
    }
    if (wallet.balanceSats < satsToSend) {
      setError(
        t("chama.needSats", {
          balance: number(wallet.balanceSats),
          needed: number(satsToSend),
        }),
      );
      return;
    }
    payLock.current = true;
    setBusy(true);
    setError(null);
    try {
      const next = await payAndRecord(
        current,
        actor.id,
        satsToSend,
        new Date().toISOString(),
        (destination, amountSats) => wallet.withdrawSats(amountSats, destination),
      );
      persist(next);
    } catch (err) {
      setError(explain(err, "chama.payFailed"));
    } finally {
      payLock.current = false;
      setBusy(false);
    }
  }

  function onSaveAddress() {
    if (!actor) return;
    try {
      persist(setOwnLightningAddress(current, actor.id, addressDraft));
      setAddressDraft("");
    } catch (err) {
      setError(explain(err, "chama.saveFailed"));
    }
  }

  function onUseBreezAddress() {
    if (!actor || !wallet.lightningAddress) return;
    try {
      persist(setOwnLightningAddress(current, actor.id, wallet.lightningAddress));
    } catch (err) {
      setError(explain(err, "chama.useFailed"));
    }
  }

  function onOptIn() {
    if (!actor) return;
    try {
      persist(optInReliabilityBadge(current, actor.id, new Date().toISOString()));
    } catch (err) {
      setError(explain(err, "chama.noteFailed"));
    }
  }

  function roleText(role: "receives" | "recorded" | "waiting", sentSats?: number): string {
    if (role === "receives") return t("chama.role.receives");
    if (role === "recorded") {
      return sentSats && sentSats > 0
        ? t("chama.role.sent", { sats: number(sentSats) })
        : t("chama.role.recorded");
    }
    return t("chama.role.waiting");
  }

  const cadence =
    onboardingChama?.cadence === "weekly" ? t("chama.aWeek") : t("chama.aMonth");
  const contribution = kes(current.monthlyContributionKes);

  const aside = (
    <section className="card text-sm">
      <p className="text-xs tracking-wide text-moss uppercase">{t("chama.thisRound")}</p>
      <p className="mt-1 font-semibold text-pine">{t("chama.receives", { name: view.recipient.name })}</p>
      <p className="mt-2 leading-6 text-ink/70">
        {t("chama.fromEachLead", { amount: contribution })}
        <span className="break-all">{view.payDestination}</span>
        {t("chama.fromEachEnd")}
        {view.payDestination !== view.recipient.lightningAddress ? t("chama.staysOnAddress") : null}
      </p>
      <p className="mt-3 text-ink/70">
        {view.completedRounds === 0
          ? t("chama.noRoundFinished")
          : view.completedRounds === 1
            ? t("chama.roundsOne", { count: view.completedRounds })
            : t("chama.roundsMany", { count: view.completedRounds })}
      </p>
      <p className="mt-3 text-xs leading-5 text-ink/55">{t("chama.custody")}</p>
    </section>
  );

  return (
    <PageFrame
      title={t("chama.title")}
      backHref="/"
      description={
        onboardingChama
          ? t("chama.named", {
              name: onboardingChama.name,
              amount: kes(onboardingChama.amountKes),
              cadence,
            })
          : t("chama.noName")
      }
      aside={aside}
    >
      {onboardingChama ? (
        <section className="card mb-6 md:mb-4">
          <p className="text-xs font-semibold tracking-wide text-moss uppercase">{t("chama.yourChama")}</p>
          <h2 className="mt-1 font-serif text-2xl text-pine">{onboardingChama.name}</h2>
          <p className="mt-2 text-sm leading-6 text-ink/75">
            {t("chama.entered", {
              amount: kes(onboardingChama.amountKes),
              cadence,
            })}
          </p>
        </section>
      ) : null}
      <section className="card">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex rounded-full bg-brass/15 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-brass uppercase">
            {t("chama.demoCircle")}
          </span>
          <span className="text-xs text-ink/60">{t("chama.eachMonth", { amount: contribution })}</span>
        </div>
        <h2 className="font-serif text-2xl text-pine">{onboardingChama?.name ?? t("chama.demoRound")}</h2>
        <p className="mt-2 text-sm leading-6 text-ink/75">
          {t("chama.waiting", { amount: kes(view.waitingKes) })}
        </p>

        <label className="mt-5 block text-xs font-semibold tracking-wide text-moss uppercase">
          {t("chama.belongsTo")}
          <select
            className="field mt-2"
            value={actor?.id ?? ""}
            disabled={busy}
            onChange={(event) => {
              setActorId(event.target.value);
              setError(null);
              setAddressDraft("");
            }}
          >
            {current.members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-2 text-xs leading-5 text-ink/55">{t("chama.switchHint")}</p>

        <ul className="mt-5 divide-y divide-sand">
          {view.rows.map((row) => {
            const payment = current.contributions.find(
              (record) =>
                record.cycleId === view.cycle.id && record.payerId === row.member.id,
            );
            const sentSats =
              payment?.settlement === "lightning" ? payment.amountSats : undefined;
            return (
              <li key={row.member.id} className="flex items-start justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold text-ink">
                    {row.member.name}
                    {row.member.id === actor?.id ? t("chama.thisPhone") : ""}
                  </p>
                  <p className="mt-0.5 break-all text-xs text-ink/55">{row.member.lightningAddress}</p>
                </div>
                <p className="shrink-0 text-right text-xs font-semibold text-pine">
                  {roleText(row.role, sentSats)}
                </p>
              </li>
            );
          })}
        </ul>

        {actor && actorRow?.role === "waiting" && demoDestination ? (
          <button
            type="button"
            className="btn btn-primary mt-4 w-full"
            disabled={busy}
            onClick={onRecordDemo}
          >
            {t("chama.recordDemo", { amount: contribution })}
          </button>
        ) : null}
        {actor && actorRow?.role === "waiting" && !demoDestination && ownsThisWallet ? (
          <button
            type="button"
            className="btn btn-primary mt-4 w-full"
            disabled={busy || !satsToSend}
            onClick={() => void onPayFromWallet()}
          >
            {busy
              ? t("chama.sending")
              : satsToSend
                ? t("chama.pay", { sats: number(satsToSend) })
                : quoteFailed
                  ? t("chama.priceFailed")
                  : t("chama.pricing")}
          </button>
        ) : null}
        {actor && actorRow?.role === "waiting" && !demoDestination && !ownsThisWallet ? (
          <p className="mt-4 text-sm leading-6 text-ink/75">
            {t("chama.payOwn", { address: view.payDestination })}
          </p>
        ) : null}
        {actor && actorRow?.role === "receives" ? (
          <p className="mt-4 text-sm leading-6 text-ink/75">
            {t("chama.othersPay", { address: actor.lightningAddress })}
          </p>
        ) : null}
        {actor && actorRow?.role === "recorded" ? (
          <p className="mt-4 text-sm leading-6 text-ink/75">
            {actorPayment?.settlement === "lightning" && actorPayment.amountSats
              ? t("chama.sentTo", {
                  name: actor.name,
                  sats: number(actorPayment.amountSats),
                  destination: actorPayment.destination,
                })
              : t("chama.alreadyRecorded", { name: actor.name })}
          </p>
        ) : null}

        {error ? <p className="mt-3 text-sm text-brass">{error}</p> : null}
      </section>

      <section className="card mt-6 md:mt-4">
        <h2 className="font-serif text-xl text-pine">{t("chama.receiveTitle")}</h2>
        <p className="mt-2 text-sm leading-6 text-ink/75">{t("chama.receiveBody")}</p>
        <p className="mt-3 break-all text-sm font-medium text-pine">
          {actor?.lightningAddress}
        </p>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:gap-2">
          <input
            className="field"
            value={addressDraft}
            placeholder={t("chama.addressPlaceholder")}
            aria-label={t("chama.addressAria")}
            onChange={(event) => setAddressDraft(event.target.value)}
            disabled={busy}
          />
          <button
            type="button"
            className="btn btn-secondary shrink-0"
            disabled={busy}
            onClick={onSaveAddress}
          >
            {t("chama.saveAddress")}
          </button>
        </div>
        {actor && wallet.status === "ready" && wallet.lightningAddress ? (
          <button
            type="button"
            className="btn btn-ghost mt-3"
            disabled={busy}
            onClick={onUseBreezAddress}
          >
            {t("chama.useBreez")}
          </button>
        ) : null}
      </section>

      <section className="card mt-6 md:mt-4">
        <h2 className="font-serif text-xl text-pine">{t("chama.reliabilityTitle")}</h2>
        <p className="mt-2 text-sm leading-6 text-ink/75">{t("chama.reliabilityBody")}</p>
        {badge ? (
          <p className="mt-3 text-sm font-medium text-pine">
            {t("chama.savedNote", { ref: badge.proof.ref ?? "" })}
          </p>
        ) : (
          <button
            type="button"
            className="btn btn-secondary mt-4"
            disabled={busy || view.completedRounds === 0}
            onClick={onOptIn}
          >
            {t("chama.keepNote")}
          </button>
        )}
      </section>

      <button
        type="button"
        className="btn btn-ghost mt-6 md:mt-4"
        disabled={busy}
        onClick={() => {
          const fresh = createDemoChamaSisters();
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
          setCircle(fresh);
          setActorId("amina");
          setError(null);
          setAddressDraft("");
        }}
      >
        {t("chama.reset")}
      </button>
    </PageFrame>
  );
}
