"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useState } from "react";
import { PAST_PERFORMANCE_DISCLAIMER } from "@pesasense/core";
import { ProfileRequired } from "../../components/profile-required";
import { formatKes } from "../../lib/format";
import { factsFromProfile } from "../../lib/sensi-facts";
import { useActiveProfile } from "../../lib/use-active-profile";

/**
 * Thin Sensi voice vertical: profile facts → Qwen summary → ElevenLabs TTS.
 * Privacy: numbers leave the device for this path (unlike pure on-device UI).
 * Telegram already uploads statements; this path only sends surplus/habit facts.
 */
function SensiVoiceContent() {
  const active = useActiveProfile();
  const [pictureConfirmed, setPictureConfirmed] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"summary" | "speak" | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  if (!active.ready) {
    return <ProfileRequired />;
  }

  const facts = factsFromProfile(active.profile);

  async function onSummarize() {
    setError(null);
    setSummary(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    if (!pictureConfirmed) {
      setError("Confirm you can see Sensi's picture before quoting numbers.");
      return;
    }
    setBusy("summary");
    try {
      const res = await fetch("/api/sensi/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facts, pictureConfirmed: true }),
      });
      const data = (await res.json()) as { summary?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not get a summary.");
        return;
      }
      setSummary(data.summary ?? null);
    } catch {
      setError("Could not reach the summary service.");
    } finally {
      setBusy(null);
    }
  }

  async function onSpeak() {
    if (!summary) return;
    setError(null);
    setBusy("speak");
    try {
      const res = await fetch("/api/sensi/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: summary }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Could not play voice.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(url);
    } catch {
      setError("Could not reach ElevenLabs.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="flex w-full flex-col gap-5">
      <header>
        <p className="text-[11px] font-semibold tracking-[0.14em] text-teal uppercase">
          Sensi · Quinn
        </p>
        <h1 className="mt-1 text-[28px] leading-9 font-bold tracking-tight text-ink">
          Voice money picture
        </h1>
        <p className="mt-1 text-sm leading-6 text-slate">
          Education, not advice. Numbers come from your profile on this phone.
          Bitcoin can lose value.
        </p>
      </header>

      <section className="flex flex-col items-center gap-3 rounded-[20px] bg-mint/40 px-4 py-5">
        <Image
          src="/sensi.png"
          alt="Sensi, the PesaSense guide"
          width={200}
          height={240}
          className="h-auto w-[min(12rem,50vw)] object-contain"
          priority
        />
        <label className="flex items-start gap-2 text-sm text-ink">
          <input
            type="checkbox"
            className="mt-1"
            checked={pictureConfirmed}
            onChange={(event) => setPictureConfirmed(event.target.checked)}
          />
          <span>I can see Sensi&apos;s picture — quote only after I confirm.</span>
        </label>
      </section>

      <section className="rounded-[20px] bg-white p-5 shadow-card">
        <p className="text-[11px] font-semibold tracking-[0.12em] text-slate uppercase">
          Profile facts (not invented)
        </p>
        <ul className="mt-3 space-y-1 text-sm text-ink">
          <li>Surplus floor: {formatKes(facts.surplusFloorKes)}</li>
          <li>Typical surplus: {formatKes(facts.surplusTypicalKes)}</li>
          <li>Ceiling: {formatKes(facts.surplusCeilingKes)}</li>
          <li>
            Habit:{" "}
            {facts.habitKes != null && facts.habitCadence
              ? `${formatKes(facts.habitKes)} / ${facts.habitCadence}`
              : "Not set"}
          </li>
        </ul>
        <p className="mt-3 text-xs leading-5 text-slate">
          This path sends these facts to Qwen for wording, then to ElevenLabs for
          speech. Keys stay in server env. Without keys the buttons explain what is
          missing.
        </p>
        <button
          type="button"
          className="btn btn-accent mt-4 w-full"
          disabled={busy != null || !pictureConfirmed}
          onClick={() => void onSummarize()}
        >
          {busy === "summary" ? "Asking Quinn…" : "Explain my picture"}
        </button>
        <button
          type="button"
          className="btn btn-secondary mt-3 w-full"
          disabled={busy != null || !summary}
          onClick={() => void onSpeak()}
        >
          {busy === "speak" ? "Speaking…" : "Play with ElevenLabs"}
        </button>
        {error ? (
          <p className="mt-3 text-sm font-semibold text-warning" role="alert">
            {error}
          </p>
        ) : null}
        {summary ? (
          <p className="mt-4 text-sm leading-6 text-ink whitespace-pre-wrap">{summary}</p>
        ) : null}
        {audioUrl ? (
          <audio className="mt-3 w-full" controls src={audioUrl} autoPlay>
            Your browser cannot play this audio.
          </audio>
        ) : null}
      </section>

      <p className="text-xs leading-5 text-slate">{PAST_PERFORMANCE_DISCLAIMER}</p>
      <Link href="/habit" className="text-sm font-semibold text-teal">
        Back to habit
      </Link>
    </main>
  );
}

export default function SensiPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          <div className="animate-pulse h-6 w-32 rounded-full bg-pearl" />
          <div className="card animate-pulse h-40 bg-pearl" />
        </main>
      }
    >
      <SensiVoiceContent />
    </Suspense>
  );
}
