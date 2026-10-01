"use client";

import { useEffect, useState } from "react";
import {
  createDemoChamaSisters,
  optInReliabilityBadge,
  parseChamaCircle,
  recordOwnContribution,
  roundView,
  setOwnLightningAddress,
  type ChamaCircle,
} from "@pesasense/nostr";
import { PageFrame } from "../../components/page-frame";
import { useBreezWallet } from "../../contexts/breez-wallet-context";

const STORAGE_KEY = "pesasense.chama.v1";

function formatKes(amount: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(amount);
}

function roleLabel(role: "receives" | "recorded" | "waiting"): string {
  if (role === "receives") return "Receives this round";
  if (role === "recorded") return "Recorded on their phone";
  return "Not recorded yet";
}

export function ChamaFlow() {
  const wallet = useBreezWallet();
  const [circle, setCircle] = useState<ChamaCircle | null>(null);
  const [actorId, setActorId] = useState("amina");
  const [error, setError] = useState<string | null>(null);
  const [addressDraft, setAddressDraft] = useState("");

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

  if (!circle) {
    return (
      <PageFrame title="Chama" description="Loading the demo circle.">
        <section className="card text-sm text-ink/70">Loading Chama Sisters.</section>
      </PageFrame>
    );
  }

  const current = circle;
  const view = roundView(current);
  const actor = current.members.find((member) => member.id === actorId) ?? current.members[0];
  const actorRow = actor ? view.rows.find((row) => row.member.id === actor.id) : undefined;
  const badge = actor
    ? current.badgeOptIns.find((optIn) => optIn.memberId === actor.id)
    : undefined;

  function persist(next: ChamaCircle) {
    setCircle(next);
    setError(null);
  }

  function onRecord() {
    if (!actor) return;
    try {
      persist(recordOwnContribution(current, actor.id, new Date().toISOString()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record this contribution.");
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
    if (!actor || actor.id !== "amina" || !wallet.lightningAddress) return;
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
        <span className="break-all">{view.recipient.lightningAddress}</span>.
      </p>
      <p className="mt-3 text-ink/70">
        {view.completedRounds === 0
          ? "No round has finished yet."
          : `${view.completedRounds} round${view.completedRounds === 1 ? "" : "s"} finished.`}
      </p>
      <p className="mt-3 text-xs leading-5 text-ink/55">
        PesaSense does not hold the sats and cannot move them. Recording here does not send a
        payment.
      </p>
    </section>
  );

  return (
    <PageFrame
      title="Chama"
      backHref="/"
      description="Chama Sisters is an invented merry-go-round. Each person pays the member whose turn it is, from a wallet they control. Nobody holds the group's money."
      aside={aside}
    >
      <section className="card">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex rounded-full bg-brass/15 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-brass uppercase">
            Demo circle
          </span>
          <span className="text-xs text-ink/60">KES {current.monthlyContributionKes} each month</span>
        </div>
        <h2 className="font-serif text-2xl text-pine">{current.name}</h2>
        <p className="mt-2 text-sm leading-6 text-ink/75">
          Still waiting this round: {formatKes(view.waitingKes)}. A finished round is just a
          record that every payer confirmed their own payment.
        </p>

        <label className="mt-5 block text-xs font-semibold tracking-wide text-moss uppercase">
          This phone belongs to
          <select
            className="field mt-2"
            value={actor?.id ?? ""}
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
          {view.rows.map((row) => (
            <li key={row.member.id} className="flex items-start justify-between gap-3 py-3">
              <div>
                <p className="font-semibold text-ink">
                  {row.member.name}
                  {row.member.id === actor?.id ? " (this phone)" : ""}
                </p>
                <p className="mt-0.5 break-all text-xs text-ink/55">{row.member.lightningAddress}</p>
              </div>
              <p className="shrink-0 text-xs font-semibold text-pine">{roleLabel(row.role)}</p>
            </li>
          ))}
        </ul>

        {actor && actorRow?.role === "waiting" ? (
          <button type="button" className="btn btn-primary mt-4 w-full" onClick={onRecord}>
            Record my {formatKes(current.monthlyContributionKes)} contribution
          </button>
        ) : null}
        {actor && actorRow?.role === "receives" ? (
          <p className="mt-4 text-sm leading-6 text-ink/75">
            This round the others pay {actor.lightningAddress}. This phone does not send.
          </p>
        ) : null}
        {actor && actorRow?.role === "recorded" ? (
          <p className="mt-4 text-sm leading-6 text-ink/75">
            {actor.name} already recorded this round on their own phone.
          </p>
        ) : null}

        {error ? <p className="mt-3 text-sm text-brass">{error}</p> : null}
      </section>

      <section className="card mt-4">
        <h2 className="font-serif text-xl text-pine">Your receive address</h2>
        <p className="mt-2 text-sm leading-6 text-ink/75">
          When it is your turn, others pay this address. You can replace only your own.
        </p>
        <p className="mt-3 break-all text-sm font-medium text-pine">
          {actor?.lightningAddress}
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            className="field"
            value={addressDraft}
            placeholder="name@wallet.com"
            aria-label="Your Lightning address"
            onChange={(event) => setAddressDraft(event.target.value)}
          />
          <button type="button" className="btn btn-secondary shrink-0" onClick={onSaveAddress}>
            Save my address
          </button>
        </div>
        {actor?.id === "amina" && wallet.status === "ready" && wallet.lightningAddress ? (
          <button type="button" className="btn btn-ghost mt-3" onClick={onUseBreezAddress}>
            Use my Breez address
          </button>
        ) : null}
      </section>

      <section className="card mt-4">
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
            disabled={view.completedRounds === 0}
            onClick={onOptIn}
          >
            Keep a note for this phone
          </button>
        )}
      </section>

      <button
        type="button"
        className="btn btn-ghost mt-4"
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
