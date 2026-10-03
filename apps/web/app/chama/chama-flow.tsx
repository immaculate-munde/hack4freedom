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
import { useBreezWallet } from "../../contexts/breez-wallet-context";
import {
  readStoredOnboardingChama,
  type OnboardingChama,
} from "../../lib/onboarding-chama";

const STORAGE_KEY = "pesasense.chama.v1";

function formatKes(amount: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(amount);
}

function roleLabel(
  role: "receives" | "recorded" | "waiting",
  sentSats?: number,
): string {
  if (role === "receives") return "Receives this round";
  if (role === "recorded") {
    return sentSats && sentSats > 0 ? `Sent ${sentSats} sats` : "Recorded on their phone";
  }
  return "Not recorded yet";
}

export function ChamaFlow() {
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
      <PageFrame title="Chama" description="Loading the demo circle.">
        <section className="card text-sm text-ink/70">Loading.</section>
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
      <PageFrame title="Chama" description="This saved circle cannot be read.">
        <section className="card">
          <p className="text-sm leading-6 text-ink/75">
            The saved chama record is incomplete, so it was not applied.
          </p>
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
            Reset demo circle
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
      setError(err instanceof Error ? err.message : "Could not record this contribution.");
    }
  }

  async function onPayFromWallet() {
    if (!actor || busy || payLock.current || !satsToSend) return;
    if (wallet.status !== "ready" || wallet.lightningAddress !== actor.lightningAddress) {
      setError("Pay from the wallet that matches this member's Lightning address.");
      return;
    }
    if (wallet.balanceSats < satsToSend) {
      setError(
        `This wallet has ${wallet.balanceSats} sats. About ${satsToSend} sats are needed.`,
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
      setError(err instanceof Error ? err.message : "The payment did not finish.");
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
      setError(err instanceof Error ? err.message : "Could not save that address.");
    }
  }

  function onUseBreezAddress() {
    if (!actor || !wallet.lightningAddress) return;
    try {
      persist(setOwnLightningAddress(current, actor.id, wallet.lightningAddress));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not use this wallet address.");
    }
  }

  function onOptIn() {
    if (!actor) return;
    try {
      persist(optInReliabilityBadge(current, actor.id, new Date().toISOString()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that note.");
    }
  }

  const aside = (
    <section className="card text-sm">
      <p className="text-xs tracking-wide text-moss uppercase">This round</p>
      <p className="mt-1 font-semibold text-pine">{view.recipient.name} receives</p>
      <p className="mt-2 leading-6 text-ink/70">
        {formatKes(current.monthlyContributionKes)} from each other member, paid to{" "}
        <span className="break-all">{view.payDestination}</span>.
        {view.payDestination !== view.recipient.lightningAddress ? (
          <> This round stays on that address because a payment already went there.</>
        ) : null}
      </p>
      <p className="mt-3 text-ink/70">
        {view.completedRounds === 0
          ? "No round has finished yet."
          : `${view.completedRounds} round${view.completedRounds === 1 ? "" : "s"} finished.`}
      </p>
      <p className="mt-3 text-xs leading-5 text-ink/55">
        PesaSense does not hold the sats. A real address is paid from this phone's own wallet.
        A demo address is only a record.
      </p>
    </section>
  );

  return (
    <PageFrame
      title="Chama"
      backHref="/"
      description={
        onboardingChama
          ? `${onboardingChama.name}: ${formatKes(onboardingChama.amountKes)} ${onboardingChama.cadence === "weekly" ? "a week" : "a month"}. Payments come from your own wallet.`
          : "No chama name was entered on this phone. The round below is a demo record only. Nobody holds the group's money."
      }
      aside={aside}
    >
      {onboardingChama ? (
        <section className="card mb-6 md:mb-4">
          <p className="text-xs font-semibold tracking-wide text-moss uppercase">Your chama</p>
          <h2 className="mt-1 font-serif text-2xl text-pine">{onboardingChama.name}</h2>
          <p className="mt-2 text-sm leading-6 text-ink/75">
            {formatKes(onboardingChama.amountKes)}{" "}
            {onboardingChama.cadence === "weekly" ? "a week" : "a month"}, from what you
            entered. Payments come from your own wallet. Nothing is sent until you pay.
          </p>
        </section>
      ) : null}
      <section className="card">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex rounded-full bg-brass/15 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-brass uppercase">
            Demo circle
          </span>
          <span className="text-xs text-ink/60">KES {current.monthlyContributionKes} each month</span>
        </div>
        <h2 className="font-serif text-2xl text-pine">{onboardingChama?.name ?? "Demo round"}</h2>
        <p className="mt-2 text-sm leading-6 text-ink/75">
          Still waiting this round: {formatKes(view.waitingKes)}. A finished round is just a
          record that every payer confirmed their own payment.
        </p>

        <label className="mt-5 block text-xs font-semibold tracking-wide text-moss uppercase">
          This phone belongs to
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
        <p className="mt-2 text-xs leading-5 text-ink/55">
          A real circle uses each member's own phone. Switching here only changes whose
          confirmation you can record.
        </p>

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
                    {row.member.id === actor?.id ? " (this phone)" : ""}
                  </p>
                  <p className="mt-0.5 break-all text-xs text-ink/55">{row.member.lightningAddress}</p>
                </div>
                <p className="shrink-0 text-right text-xs font-semibold text-pine">
                  {roleLabel(row.role, sentSats)}
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
            Record demo contribution ({formatKes(current.monthlyContributionKes)}, no sats sent)
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
              ? "Sending from your wallet…"
              : satsToSend
                ? `Pay ${satsToSend} sats from my wallet`
                : quoteFailed
                  ? "Could not price this contribution"
                  : "Pricing this contribution…"}
          </button>
        ) : null}
        {actor && actorRow?.role === "waiting" && !demoDestination && !ownsThisWallet ? (
          <p className="mt-4 text-sm leading-6 text-ink/75">
            This round pays {view.payDestination}. Save this phone's own Breez address on your
            member profile, then pay from that wallet. This phone cannot pay for someone else.
          </p>
        ) : null}
        {actor && actorRow?.role === "receives" ? (
          <p className="mt-4 text-sm leading-6 text-ink/75">
            This round the others pay {actor.lightningAddress}. This phone does not send.
          </p>
        ) : null}
        {actor && actorRow?.role === "recorded" ? (
          <p className="mt-4 text-sm leading-6 text-ink/75">
            {actorPayment?.settlement === "lightning" && actorPayment.amountSats
              ? `${actor.name} sent ${actorPayment.amountSats} sats to ${actorPayment.destination}.`
              : `${actor.name} already recorded this round on their own phone.`}
          </p>
        ) : null}

        {error ? <p className="mt-3 text-sm text-brass">{error}</p> : null}
      </section>

      <section className="card mt-6 md:mt-4">
        <h2 className="font-serif text-xl text-pine">Your receive address</h2>
        <p className="mt-2 text-sm leading-6 text-ink/75">
          When it is your turn, others pay this address. You can replace only your own.
        </p>
        <p className="mt-3 break-all text-sm font-medium text-pine">
          {actor?.lightningAddress}
        </p>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:gap-2">
          <input
            className="field"
            value={addressDraft}
            placeholder="name@wallet.com"
            aria-label="Your Lightning address"
            onChange={(event) => setAddressDraft(event.target.value)}
            disabled={busy}
          />
          <button
            type="button"
            className="btn btn-secondary shrink-0"
            disabled={busy}
            onClick={onSaveAddress}
          >
            Save my address
          </button>
        </div>
        {actor && wallet.status === "ready" && wallet.lightningAddress ? (
          <button
            type="button"
            className="btn btn-ghost mt-3"
            disabled={busy}
            onClick={onUseBreezAddress}
          >
            Use my Breez address
          </button>
        ) : null}
      </section>

      <section className="card mt-6 md:mt-4">
        <h2 className="font-serif text-xl text-pine">Reliability note</h2>
        <p className="mt-2 text-sm leading-6 text-ink/75">
          After a round finishes, this phone can keep an opt-in note. It is not published.
        </p>
        {badge ? (
          <p className="mt-3 text-sm font-medium text-pine">
            Saved on this device ({badge.proof.ref}).
          </p>
        ) : (
          <button
            type="button"
            className="btn btn-secondary mt-4"
            disabled={busy || view.completedRounds === 0}
            onClick={onOptIn}
          >
            Keep a note for this phone
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
        Reset demo circle
      </button>
    </PageFrame>
  );
}
