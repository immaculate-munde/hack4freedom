"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useI18n } from "../contexts/language-context";
import { fetchSensiChat } from "../lib/sensi-api";
import { factsFromProfile } from "../lib/sensi-facts";
import { useActiveProfile } from "../lib/use-active-profile";
import { SensiAvatar } from "./sensi-avatar";

type SensiTopic =
  | "surplus"
  | "spend"
  | "bitcoin"
  | "wallet"
  | "habit"
  | "chama"
  | "scam"
  | "fallback";

type GuideTurn = {
  id: number;
  question: string;
  reply: string | null;
  topic: SensiTopic;
  error?: string;
};

const SENSI_PROMPTS: Record<Exclude<SensiTopic, "fallback">, string> = {
  surplus: "sensi.askSurplus",
  spend: "sensi.askSpend",
  bitcoin: "sensi.howBitcoin",
  wallet: "sensi.askWallet",
  habit: "sensi.askHabit",
  chama: "sensi.askChama",
  scam: "sensi.askScam",
};

const SENSI_LINKS: Record<SensiTopic, { href: string; label: string }> = {
  surplus: { href: "/surplus", label: "sensi.seeSurplus" },
  spend: { href: "/overview#month-path", label: "sensi.seePath" },
  bitcoin: { href: "/learn", label: "sensi.seeLearn" },
  wallet: { href: "/wallet", label: "sensi.seeWallet" },
  habit: { href: "/habit", label: "sensi.seeHabit" },
  chama: { href: "/chama", label: "sensi.seeChama" },
  scam: { href: "/learn", label: "sensi.seeLearn" },
  fallback: { href: "/overview", label: "sensi.seePath" },
};

function sensiStarters(pathname: string): Array<Exclude<SensiTopic, "fallback">> {
  if (pathname.startsWith("/wallet")) return ["wallet", "scam"];
  if (pathname.startsWith("/surplus")) return ["surplus", "spend"];
  if (pathname.startsWith("/habit")) return ["habit", "surplus"];
  if (pathname.startsWith("/chama")) return ["chama", "wallet"];
  if (pathname.startsWith("/learn")) return ["bitcoin", "scam"];
  if (pathname.startsWith("/invest")) return ["surplus", "bitcoin"];
  if (pathname.startsWith("/overview")) return ["spend", "surplus"];
  return ["spend", "surplus"];
}

function sensiTopic(text: string): SensiTopic {
  const question = text.toLowerCase();
  if (/scam|guaranteed|recovery word|seed|ulaghai|maneno ya kurejesha|faida iliyohakikishwa/.test(question)) {
    return "scam";
  }
  if (/wallet|custody|private key|mkoba|funguo|kujihifadhi/.test(question)) return "wallet";
  if (/chama/.test(question)) return "chama";
  if (/habit|monthly|kila mwezi|tabia/.test(question)) return "habit";
  if (
    /spend|expense|bill|rent|grocer|transport|airtime|matumizi|bili|kodi|mboga|nauli|where.*money|pesa zangu/.test(
      question,
    )
  ) {
    return "spend";
  }
  if (/surplus|floor|buffer|cushion|zaida|ziada|sakafu|hifadhi/.test(question)) return "surplus";
  if (/bitcoin|btc|sats/.test(question)) return "bitcoin";
  return "fallback";
}

type GuideProps = {
  open: boolean;
  onClose: () => void;
  launcherRef: React.MutableRefObject<HTMLButtonElement | null>;
  moreOpen: boolean;
  onToggle: (event: { currentTarget: HTMLButtonElement }) => void;
};

function SensiGuideInner({ open, onClose, launcherRef, moreOpen, onToggle }: GuideProps) {
  const pathname = usePathname() ?? "/";
  const { t } = useI18n();
  const active = useActiveProfile();
  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState<GuideTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  const turnsRef = useRef<GuideTurn[]>([]);

  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  useEffect(() => {
    const thread = threadRef.current;
    if (!thread) return;
    thread.scrollTop = thread.scrollHeight;
  }, [turns, open, busy]);

  useEffect(() => {
    if (!open) {
      if (wasOpen.current) launcherRef.current?.focus();
      wasOpen.current = false;
      return;
    }
    wasOpen.current = true;
    const dialog = document.getElementById("sensi-guide");
    const input = dialog?.querySelector("input");
    if (window.matchMedia("(pointer: fine)").matches) input?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = [
        ...dialog.querySelectorAll<HTMLElement>("a[href], button:not(:disabled), input:not(:disabled)"),
      ];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, launcherRef]);

  async function askSensi(text: string, topic?: SensiTopic) {
    const question = text.trim();
    if (!question || busy) return;

    if (!active.ready) {
      setTurns((current) =>
        [
          ...current,
          {
            id: Date.now(),
            question,
            reply: null,
            topic: topic ?? sensiTopic(question),
            error: t("sensi.needProfile"),
          },
        ].slice(-6),
      );
      setDraft("");
      return;
    }

    const id = Date.now();
    const nextTopic = topic ?? sensiTopic(question);
    const pending: GuideTurn = { id, question, reply: null, topic: nextTopic };
    const withUser = [...turnsRef.current, pending].slice(-6);
    setTurns(withUser);
    setDraft("");
    setBusy(true);

    const history = withUser
      .filter((turn) => turn.reply)
      .flatMap((turn) => [
        { role: "user" as const, content: turn.question },
        { role: "assistant" as const, content: turn.reply! },
      ]);
    history.push({ role: "user", content: question });

    const result = await fetchSensiChat({
      facts: factsFromProfile(active.profile),
      messages: history.slice(-24),
      pictureConfirmed: true,
    });

    setTurns((current) =>
      current.map((turn) =>
        turn.id === id
          ? "reply" in result
            ? { ...turn, reply: result.reply }
            : { ...turn, error: result.error }
          : turn,
      ),
    );
    setBusy(false);
  }

  return (
    <>
      {open ? (
        <div aria-hidden="true" onClick={onClose} className="fixed inset-0 z-40 bg-pine/20 lg:bg-transparent" />
      ) : null}
      {open ? (
        <div
          id="sensi-guide"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sensi-guide-title"
          className="fixed right-4 bottom-24 z-50 flex max-h-[min(36rem,calc(100dvh-8rem))] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-sand bg-paper shadow-2xl lg:bottom-6 lg:right-6"
        >
          <div className="flex shrink-0 items-start justify-between gap-3 px-4 pt-4">
            <div className="flex items-center gap-2">
              <SensiAvatar size="sm" mood={turns.some((turn) => turn.reply) ? "happy" : "neutral"} />
              <div>
                <p id="sensi-guide-title" className="text-sm font-semibold text-pine">
                  {t("sensi.hi")}
                </p>
                <p className="text-xs text-slate">{t("sensi.calm")}</p>
              </div>
            </div>
            <button
              type="button"
              aria-label={t("sensi.close")}
              onClick={onClose}
              className="btn inline-flex !h-8 !min-h-8 !w-8 items-center justify-center rounded-full bg-pearl !p-0 text-slate"
            >
              ×
            </button>
          </div>
          <div ref={threadRef} className="mt-3 min-h-0 flex-1 overflow-y-auto px-4" aria-live="polite">
            {turns.length === 0 ? (
              <p className="text-sm leading-6 text-ink">{t("sensi.askAnything")}</p>
            ) : (
              <div className="flex flex-col gap-4 pb-1">
                {turns.map((turn) => (
                  <div key={turn.id} className="flex flex-col gap-2">
                    <p className="ml-10 self-end rounded-2xl rounded-br-md bg-pine px-3 py-2 text-sm leading-5 text-on-brand">
                      {turn.question}
                    </p>
                    {turn.reply ? (
                      <div>
                        <p className="text-sm leading-6 text-ink">{turn.reply}</p>
                        <Link
                          href={SENSI_LINKS[turn.topic].href}
                          className="btn btn-secondary mt-2 inline-flex !min-h-0 rounded-full !px-3 !py-1.5 text-xs"
                        >
                          {t(SENSI_LINKS[turn.topic].label)}
                        </Link>
                      </div>
                    ) : turn.error ? (
                      <p className="text-sm font-semibold leading-6 text-warning" role="alert">
                        {turn.error}
                      </p>
                    ) : (
                      <p className="text-sm text-slate">{t("sensi.thinking")}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="shrink-0 px-4 pt-3 pb-4">
            <div className="flex flex-wrap gap-2">
              {sensiStarters(pathname).map((topic) => (
                <button
                  key={topic}
                  type="button"
                  disabled={busy}
                  className="btn rounded-full border border-sand bg-surface !min-h-0 !px-3 !py-1.5 text-left text-xs font-semibold text-ink disabled:opacity-50"
                  onClick={() => void askSensi(t(SENSI_PROMPTS[topic]), topic)}
                >
                  {t(SENSI_PROMPTS[topic])}
                </button>
              ))}
            </div>
            <form
              className="mt-3 flex items-center gap-2 border-t border-sand pt-3"
              onSubmit={(event) => {
                event.preventDefault();
                void askSensi(draft);
              }}
            >
              <input
                type="text"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={t("sensi.placeholder")}
                aria-label={t("sensi.placeholder")}
                className="field min-h-12 min-w-0 flex-1 text-sm"
                disabled={busy}
              />
              <button
                type="submit"
                className="btn btn-accent !min-h-12 shrink-0 rounded-full !px-4"
                disabled={busy || !draft.trim()}
              >
                {t("sensi.send")}
              </button>
            </form>
            <p className="mt-2 text-[11px] leading-4 text-slate">
              {t("sensi.liveHint")}{" "}
              <Link href="/sensi" className="font-semibold text-pine underline-offset-2 hover:underline">
                {t("sensi.openVoice")}
              </Link>
            </p>
          </div>
        </div>
      ) : null}
      <button
        type="button"
        aria-label={t("nav.openSensi")}
        aria-expanded={open}
        onClick={onToggle}
        className={`btn fixed right-4 bottom-20 z-50 flex h-14 w-14 items-center justify-center rounded-full border-2 border-paper bg-[#f3efe4] shadow-[0_8px_24px_rgb(30_58_50/0.18)] lg:hidden ${
          moreOpen || open ? "pointer-events-none invisible" : ""
        }`}
      >
        <SensiAvatar size="sm" mood={open ? "happy" : "neutral"} />
      </button>
    </>
  );
}

export function SensiGuide(props: GuideProps) {
  return (
    <Suspense fallback={null}>
      <SensiGuideInner {...props} />
    </Suspense>
  );
}
