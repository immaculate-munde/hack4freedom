"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { PAST_PERFORMANCE_DISCLAIMER } from "@pesasense/core";
import { ProfileRequired } from "../../components/profile-required";
import { useFormat } from "../../contexts/language-context";
import { factsFromProfile } from "../../lib/sensi-facts";
import { useActiveProfile } from "../../lib/use-active-profile";

type Turn = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

type SpeechResultRow = ArrayLike<{ transcript: string }> & { isFinal?: boolean };

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<SpeechResultRow> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const host = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null;
}

function IconSpark({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.5 13.8 9l6.7 1.8-6.7 1.8L12 21.5l-1.8-8.9L3.5 10.8 10.2 9 12 2.5Z" />
    </svg>
  );
}

function IconMic({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Z" />
      <path d="M19 11a7 7 0 0 1-14 0" strokeLinecap="round" />
      <path d="M12 18v3" strokeLinecap="round" />
    </svg>
  );
}

function IconSend({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3.4 11.2 20.1 3.4a1 1 0 0 1 1.3 1.3l-7.8 16.7a1 1 0 0 1-1.9-.1l-1.7-6.4-6.4-1.7a1 1 0 0 1-.2-1.9Z" />
    </svg>
  );
}

function IconSpeaker({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M11 5 6 9H3v6h3l5 4V5Z" strokeLinejoin="round" />
      <path d="M15.5 8.5a4.5 4.5 0 0 1 0 7" strokeLinecap="round" />
      <path d="M18 6a8 8 0 0 1 0 12" strokeLinecap="round" />
    </svg>
  );
}

function IconCopy({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" strokeLinecap="round" />
    </svg>
  );
}

function IconRefresh({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M20 12a8 8 0 1 1-2.3-5.6" strokeLinecap="round" />
      <path d="M20 4v5h-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconClose({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Voice conversation with Sensi: mic (or typed) → OpenRouter chat → ElevenLabs.
 * Numbers leave the device on this path (facts + speech). Education only.
 */
function SensiVoiceContent() {
  const active = useActiveProfile();
  const { kes } = useFormat();
  const [pictureConfirmed, setPictureConfirmed] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"chat" | "speak" | "listen" | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [listening, setListening] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const turnsRef = useRef<Turn[]>([]);

  useEffect(() => {
    setMicSupported(Boolean(getSpeechRecognition()));
  }, []);

  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (audioRef.current) {
        audioRef.current.pause();
        if (audioRef.current.src.startsWith("blob:")) {
          URL.revokeObjectURL(audioRef.current.src);
        }
      }
    };
  }, []);

  if (!active.ready) {
    return <ProfileRequired />;
  }

  const facts = factsFromProfile(active.profile);

  async function playSpeech(text: string) {
    setBusy("speak");
    try {
      const res = await fetch("/api/sensi/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Could not play voice.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.pause();
        if (audioRef.current.src.startsWith("blob:")) {
          URL.revokeObjectURL(audioRef.current.src);
        }
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setBusy((current) => (current === "speak" ? null : current));
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        setBusy((current) => (current === "speak" ? null : current));
        setError("Could not play voice.");
      };
      await audio.play();
    } catch {
      setError("Could not reach ElevenLabs.");
      setBusy(null);
    }
  }

  async function sendMessage(raw: string) {
    const text = raw.trim();
    if (!text || busy) return;
    if (!pictureConfirmed) {
      setError("Confirm you can see Sensi's picture before talking about your numbers.");
      return;
    }

    setError(null);
    setVoiceTranscript(text);
    const userTurn: Turn = { id: `u-${Date.now()}`, role: "user", text };
    const nextTurns = [...turnsRef.current, userTurn];
    setTurns(nextTurns);
    setDraft("");
    setBusy("chat");

    try {
      const res = await fetch("/api/sensi/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pictureConfirmed: true,
          facts,
          messages: nextTurns.map((turn) => ({
            role: turn.role,
            content: turn.text,
          })),
        }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not get a reply.");
        setBusy(null);
        return;
      }
      const reply = data.reply?.trim();
      if (!reply) {
        setError("Sensi returned an empty reply.");
        setBusy(null);
        return;
      }
      setTurns((current) => [
        ...current,
        { id: `a-${Date.now()}`, role: "assistant", text: reply },
      ]);
      setBusy(null);
      if (autoSpeak) {
        await playSpeech(reply);
      }
    } catch {
      setError("Could not reach Sensi.");
      setBusy(null);
    }
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
    if (busy === "listen") setBusy(null);
  }

  function startListening() {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setError("This browser has no speech recognition. Type your question instead.");
      return;
    }
    if (!pictureConfirmed) {
      setError("Confirm you can see Sensi's picture first.");
      return;
    }
    setError(null);
    recognitionRef.current?.stop();
    const recognition = new Ctor();
    recognition.lang = "en-KE";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (transcript) {
        setVoiceTranscript(transcript);
        void sendMessage(transcript);
      }
    };
    recognition.onerror = (event) => {
      setListening(false);
      setBusy(null);
      if (event.error === "not-allowed") {
        setError("Microphone permission blocked. Allow mic, or type instead.");
      } else if (event.error !== "aborted") {
        setError("Could not hear that. Try again or type.");
      }
    };
    recognition.onend = () => {
      setListening(false);
      if (busy === "listen") setBusy(null);
    };
    recognitionRef.current = recognition;
    setListening(true);
    setBusy("listen");
    try {
      recognition.start();
    } catch {
      setListening(false);
      setBusy(null);
      setError("Could not start the microphone.");
    }
  }

  async function startPictureTalk() {
    await sendMessage(
      "Habari Sensi. Walk me through my money picture from this phone — money left after bills, my bills, and my small Bitcoin habit — in plain words.",
    );
  }

  async function regenerateLast() {
    const history = turnsRef.current;
    let lastUserIndex = -1;
    for (let i = history.length - 1; i >= 0; i -= 1) {
      if (history[i]?.role === "user") {
        lastUserIndex = i;
        break;
      }
    }
    if (lastUserIndex < 0 || busy) return;
    const question = history[lastUserIndex]?.text;
    if (!question) return;
    setTurns(history.slice(0, lastUserIndex));
    // Allow sendMessage after state flush via ref sync
    turnsRef.current = history.slice(0, lastUserIndex);
    await sendMessage(question);
  }

  async function copyText(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1600);
    } catch {
      setError("Could not copy that reply.");
    }
  }

  function openVoiceMode() {
    setVoiceMode(true);
    setVoiceTranscript("");
    setError(null);
  }

  function closeVoiceMode() {
    stopListening();
    setVoiceMode(false);
  }

  function resetVoice() {
    stopListening();
    setVoiceTranscript("");
    setError(null);
  }

  const blobClass =
    busy === "speak"
      ? "sensi-blob is-speaking"
      : listening
        ? "sensi-blob is-listening"
        : "sensi-blob";

  const factsLine = (
    <>
      Floor {kes(facts.surplusFloorKes)} · typical {kes(facts.surplusTypicalKes)} ·{" "}
      {facts.habitKes != null && facts.habitCadence
        ? `habit ${kes(facts.habitKes)} / ${facts.habitCadence}`
        : "no habit set"}
    </>
  );

  return (
    <main className="sensi-shell flex w-full flex-col gap-0 px-4 pb-5 pt-4 sm:px-5">
      <header className="flex items-center gap-3 pb-3 lg:pb-4">
        <Link
          href="/overview"
          className="sensi-glass flex h-10 w-10 items-center justify-center rounded-full text-[#f4f1e8] lg:hidden"
          aria-label="Back to overview"
        >
          <span className="text-lg leading-none">←</span>
        </Link>
        <div className="sensi-avatar-ring flex h-11 w-11 items-center justify-center rounded-full lg:h-12 lg:w-12">
          <Image
            src="/sensi.png"
            alt=""
            width={36}
            height={44}
            className="h-9 w-auto object-contain lg:h-10"
            priority
          />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold tracking-tight text-[#f4f1e8] lg:text-xl">Sensi</h1>
          <p className="truncate text-xs text-[var(--sensi-muted)] lg:text-sm">
            Your money coach · education only
          </p>
        </div>
        <label className="sensi-glass flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-[11px] text-[#f4f1e8]/90 lg:text-xs">
          <input
            type="checkbox"
            className="accent-[var(--sensi-accent)]"
            checked={autoSpeak}
            onChange={(event) => setAutoSpeak(event.target.checked)}
          />
          Voice
        </label>
      </header>

      {!pictureConfirmed ? (
        <section className="mb-3 flex items-start gap-3 rounded-[22px] border border-white/10 bg-white/5 px-4 py-3 lg:max-w-xl">
          <Image
            src="/sensi.png"
            alt="Sensi, the PesaSense guide"
            width={56}
            height={68}
            className="h-14 w-auto object-contain"
          />
          <label className="flex items-start gap-2 text-sm leading-5 text-[#f4f1e8]/90">
            <input
              type="checkbox"
              className="mt-1 accent-[var(--sensi-accent)]"
              checked={pictureConfirmed}
              onChange={(event) => setPictureConfirmed(event.target.checked)}
            />
            <span>I can see Sensi — talk about my numbers only after this.</span>
          </label>
        </section>
      ) : null}

      <p className="mb-3 text-[11px] leading-4 text-[var(--sensi-muted)] lg:hidden">{factsLine}</p>

      {voiceMode ? (
        <section
          className="flex flex-1 flex-col items-center justify-between gap-6 py-6 lg:justify-center lg:gap-10"
          aria-label="Voice mode"
        >
          <div className={`${blobClass} lg:!h-72 lg:!w-72`} aria-hidden />
          <p className="max-w-[18rem] text-center text-base leading-7 text-[#f4f1e8]/95 lg:max-w-md lg:text-lg lg:leading-8">
            {voiceTranscript ||
              (listening
                ? "Listening… speak when ready"
                : busy === "chat"
                  ? "Sensi is thinking…"
                  : busy === "speak"
                    ? "Sensi is speaking…"
                    : "Tap the mic and ask Sensi about your money picture")}
          </p>
          <div className="flex w-full items-center justify-center gap-6 pb-2">
            <button
              type="button"
              className="sensi-glass flex h-12 w-12 items-center justify-center rounded-full text-[#f4f1e8]"
              aria-label="Reset voice"
              onClick={resetVoice}
            >
              <IconRefresh className="h-5 w-5" />
            </button>
            <button
              type="button"
              className={`sensi-mic-glow flex h-16 w-16 items-center justify-center rounded-full text-[#f4f1e8] ${
                listening ? "ring-4 ring-white/30" : ""
              }`}
              disabled={busy === "chat" || busy === "speak"}
              aria-pressed={listening}
              aria-label={listening ? "Stop listening" : "Talk to Sensi"}
              onClick={() => {
                if (listening) stopListening();
                else startListening();
              }}
            >
              <IconMic className="h-7 w-7" />
            </button>
            <button
              type="button"
              className="sensi-glass flex h-12 w-12 items-center justify-center rounded-full text-[#f4f1e8]"
              aria-label="Close voice mode"
              onClick={closeVoiceMode}
            >
              <IconClose />
            </button>
          </div>
        </section>
      ) : (
        <div className="sensi-shell-desk flex min-h-0 flex-1 flex-col lg:grid">
          <div className="sensi-shell-desk-main flex min-h-0 flex-1 flex-col">
            <section
              ref={threadRef}
              className="flex min-h-[14rem] flex-1 flex-col gap-4 overflow-y-auto px-0.5 py-2 lg:min-h-0"
              aria-live="polite"
            >
              {turns.length === 0 ? (
                <div className="flex flex-1 flex-col items-start justify-center gap-4 px-1 py-8 lg:max-w-2xl lg:py-12">
                  <div className="sensi-ai-bubble max-w-[92%] rounded-[22px] px-4 py-3 text-sm leading-6 text-[#f4f1e8] lg:max-w-xl lg:px-5 lg:py-4 lg:text-base lg:leading-7">
                    Habari — I&apos;m Sensi. Ask me about the money left after your bills, your habit, or
                    anything on this phone profile. I&apos;ll keep it simple.
                  </div>
                  <button
                    type="button"
                    className="sensi-accent-btn rounded-full px-5 py-3 text-sm font-semibold text-[#f4f1e8] disabled:opacity-40"
                    disabled={!pictureConfirmed || busy != null}
                    onClick={() => void startPictureTalk()}
                  >
                    Start: explain my picture
                  </button>
                </div>
              ) : (
                turns.map((turn, index) => {
                  const isLastAssistant = turn.role === "assistant" && index === turns.length - 1;
                  return (
                    <div key={turn.id} className="flex flex-col gap-2 lg:max-w-3xl">
                      <div
                        className={`flex items-end gap-2 ${
                          turn.role === "user" ? "flex-row-reverse" : "flex-row"
                        }`}
                      >
                        {turn.role === "assistant" ? (
                          <span className="sensi-avatar-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                            <IconSpark className="h-3.5 w-3.5 text-[#f4f1e8]" />
                          </span>
                        ) : (
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-bold text-[#f4f1e8]">
                            You
                          </span>
                        )}
                        <div
                          className={`max-w-[82%] rounded-[22px] px-4 py-3 text-sm leading-6 text-[#f4f1e8] lg:max-w-[75%] lg:text-[0.95rem] lg:leading-7 ${
                            turn.role === "user"
                              ? "sensi-user-bubble rounded-br-md"
                              : "sensi-ai-bubble rounded-bl-md"
                          }`}
                        >
                          {turn.text}
                        </div>
                      </div>
                      {turn.role === "assistant" ? (
                        <div className="ml-10 flex items-center gap-1">
                          <button
                            type="button"
                            className="sensi-glass flex h-8 w-8 items-center justify-center rounded-full text-[#f4f1e8]/80"
                            aria-label="Speak reply"
                            disabled={busy != null}
                            onClick={() => void playSpeech(turn.text)}
                          >
                            <IconSpeaker />
                          </button>
                          <button
                            type="button"
                            className="sensi-glass flex h-8 w-8 items-center justify-center rounded-full text-[#f4f1e8]/80"
                            aria-label="Copy reply"
                            onClick={() => void copyText(turn.id, turn.text)}
                          >
                            <IconCopy />
                          </button>
                          {isLastAssistant ? (
                            <button
                              type="button"
                              className="sensi-glass ml-auto flex h-8 w-8 items-center justify-center rounded-full text-[#f4f1e8]/80"
                              aria-label="Regenerate reply"
                              disabled={busy != null}
                              onClick={() => void regenerateLast()}
                            >
                              <IconRefresh />
                            </button>
                          ) : null}
                          {copiedId === turn.id ? (
                            <span className="ml-1 text-[11px] text-[var(--sensi-accent)]">Copied</span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
              {busy === "chat" ? (
                <div className="flex items-center gap-2 text-xs text-[var(--sensi-muted)]">
                  <IconSpark className="h-3.5 w-3.5 text-[var(--sensi-accent)]" />
                  <span className="sensi-typing" aria-label="Sensi is thinking">
                    <span />
                    <span />
                    <span />
                  </span>
                </div>
              ) : null}
              {busy === "speak" ? (
                <p className="text-xs font-semibold text-[var(--sensi-accent)]">Sensi is speaking…</p>
              ) : null}
            </section>

            {error ? (
              <p className="mt-2 text-sm font-semibold text-[#f0a090]" role="alert">
                {error}
              </p>
            ) : null}

            <form
              className="mt-3 flex flex-col gap-2 lg:mt-4"
              onSubmit={(event) => {
                event.preventDefault();
                void sendMessage(draft);
              }}
            >
              <div className="sensi-input-pill flex items-center gap-2 rounded-full px-2 py-1.5 lg:px-3 lg:py-2">
                <button
                  type="button"
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                    listening ? "sensi-mic-glow text-[#f4f1e8]" : "bg-white/10 text-[#f4f1e8]/90"
                  }`}
                  disabled={busy === "chat" || busy === "speak"}
                  aria-label={micSupported ? "Open voice mode" : "Microphone not available"}
                  onClick={() => {
                    openVoiceMode();
                    if (micSupported && pictureConfirmed) {
                      window.setTimeout(() => startListening(), 80);
                    }
                  }}
                >
                  <IconMic />
                </button>
                <input
                  type="text"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Send message..."
                  aria-label="Message to Sensi"
                  className="min-h-11 min-w-0 flex-1 border-0 text-sm outline-none ring-0 lg:text-base"
                  disabled={busy === "chat"}
                />
                <button
                  type="submit"
                  className="sensi-accent-btn flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#f4f1e8] disabled:opacity-35"
                  disabled={busy != null || !draft.trim()}
                  aria-label="Send message"
                >
                  <IconSend className="h-4 w-4" />
                </button>
              </div>
              {!micSupported ? (
                <p className="text-[11px] text-[var(--sensi-muted)]">
                  Voice input needs Chrome or Edge. You can still type; replies can speak aloud.
                </p>
              ) : (
                <p className="text-[11px] text-[var(--sensi-muted)]">
                  Tap the mic for voice mode, or type below. Allow the mic when asked.
                </p>
              )}
            </form>
          </div>

          <aside className="sensi-shell-desk-side hidden lg:flex" aria-label="Sensi coach panel">
            <div className={`${blobClass} !h-44 !w-44`} aria-hidden />
            <div className="w-full space-y-3 text-center">
              <p className="text-sm font-semibold text-[#f4f1e8]">Your picture</p>
              <p className="text-xs leading-5 text-[var(--sensi-muted)]">{factsLine}</p>
            </div>
            <div className="flex w-full flex-col gap-2">
              <Link
                href="/overview"
                className="sensi-glass rounded-2xl px-4 py-3 text-center text-sm font-semibold text-[#f4f1e8]"
              >
                Overview
              </Link>
              <Link
                href="/habit"
                className="sensi-glass rounded-2xl px-4 py-3 text-center text-sm font-semibold text-[#f4f1e8]"
              >
                Habit
              </Link>
            </div>
          </aside>
        </div>
      )}

      {voiceMode && error ? (
        <p className="mt-2 text-center text-sm font-semibold text-[#f0a090]" role="alert">
          {error}
        </p>
      ) : null}

      <footer className="mt-4 lg:mt-3">
        <p className="text-[11px] leading-4 text-[var(--sensi-muted)]">{PAST_PERFORMANCE_DISCLAIMER}</p>
        <div className="mt-2 flex flex-wrap gap-3 text-sm font-semibold lg:hidden">
          <Link href="/overview">Overview</Link>
          <Link href="/habit">Habit</Link>
        </div>
      </footer>
    </main>
  );
}

export default function SensiPage() {
  return (
    <Suspense
      fallback={
        <main className="sensi-shell flex min-h-80 w-full flex-col gap-4 p-5">
          <div className="h-6 w-32 animate-pulse rounded-full bg-white/10" />
          <div className="h-40 animate-pulse rounded-[24px] bg-white/5" />
        </main>
      }
    >
      <SensiVoiceContent />
    </Suspense>
  );
}
