"use client";

import { Suspense, useEffect, useState, type ReactNode, useRef } from "react";
import Link from "next/link";
import {
  LEARN_TOPICS,
  PAST_PERFORMANCE_DISCLAIMER,
  getLearnTopic,
  type LearnTopic,
} from "@pesasense/core";
import { SensiAvatar } from "../../components/sensi-avatar";
import { LessonPlayer } from "../../components/learn/lesson-player";
import { LearnIllustration } from "../../components/learn/topic-illustrations";
import { markTopicCompleted, readCompletedTopics } from "../../lib/learn-progress";
import { useI18n } from "../../contexts/language-context";

function LearnPageContent() {
  const { t } = useI18n();
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [completed, setCompleted] = useState<string[]>([]);
  const [justFinished, setJustFinished] = useState<string | null>(null);

  useEffect(() => {
    setCompleted(readCompletedTopics());
  }, []);

  const activeTopic = activeTopicId ? getLearnTopic(activeTopicId) : undefined;

  if (activeTopic) {
    return (
      <main className="flex w-full flex-col gap-6 pb-24 md:pb-0">
        <LessonPlayer
          topic={activeTopic}
          onExit={() => {
            setActiveTopicId(null);
            setJustFinished(null);
          }}
          onComplete={(topicId) => {
            setCompleted(markTopicCompleted(topicId));
            setJustFinished(topicId);
            setActiveTopicId(null);
          }}
        />
      </main>
    );
  }

  const beginner = LEARN_TOPICS.filter((topic) => topic.level === "beginner");
  const intermediate = LEARN_TOPICS.filter((topic) => topic.level === "intermediate");
  const doneCount = completed.length;

  return (
    <main className="flex w-full flex-col gap-8 pb-24 md:gap-7 md:pb-0">
      <header className="relative overflow-hidden rounded-[24px] border border-sand/60 bg-gradient-to-br from-pearl via-paper to-mint/25 p-5 shadow-card sm:p-6">
        <div className="flex items-start gap-4">
          <div className="shrink-0">
            <SensiAvatar size="lg" mood="happy" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-brass uppercase">
              {t("learn.eyebrow")}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-[1.75rem]">
              {t("learn.title")}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate">{t("learn.intro")}</p>
            <p className="mt-3 text-xs font-semibold text-moss">
              {t("learn.progress", { done: doneCount, total: LEARN_TOPICS.length })}
            </p>
          </div>
        </div>
      </header>

      {justFinished ? (
        <ScrollReveal>
          <div
            className="rounded-[18px] border border-moss/40 bg-mint/20 px-4 py-3 text-sm text-pine"
            role="status"
          >
            {t("learn.finishedTopic", {
              title: getLearnTopic(justFinished)?.title ?? justFinished,
            })}
          </div>
        </ScrollReveal>
      ) : null}

      <ScrollReveal>
        <section>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.14em] text-moss uppercase">
                {t("learn.beginnerEyebrow")}
              </p>
              <h2 className="mt-1 text-base font-semibold text-ink">{t("learn.pickTopic")}</h2>
            </div>
            <p className="text-xs font-semibold text-slate">
              {t("learn.topics", { count: LEARN_TOPICS.length })}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {beginner.map((topic) => (
              <TopicCard
                key={topic.id}
                topic={topic}
                completed={completed.includes(topic.id)}
                onSelect={() => {
                  setJustFinished(null);
                  setActiveTopicId(topic.id);
                }}
                startLabel={t("learn.startLesson")}
                doneLabel={t("learn.completed")}
              />
            ))}
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal>
        <section>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-sky uppercase">
            {t("learn.intermediateEyebrow")}
          </p>
          <h2 className="mt-1 mb-3 text-base font-semibold text-ink">
            {t("learn.intermediateTitle")}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {intermediate.map((topic) => (
              <TopicCard
                key={topic.id}
                topic={topic}
                completed={completed.includes(topic.id)}
                onSelect={() => {
                  setJustFinished(null);
                  setActiveTopicId(topic.id);
                }}
                startLabel={t("learn.startLesson")}
                doneLabel={t("learn.completed")}
              />
            ))}
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal>
        <section className="rounded-[20px] border border-coral/35 bg-coral/10 p-5 shadow-card">
          <div className="flex items-center gap-2">
            <SensiAvatar size="sm" mood="thinking" />
            <div>
              <h2 className="text-sm font-semibold text-coral">{t("learn.scamTitle")}</h2>
              <p className="text-[11px] text-slate">{t("learn.scamHint")}</p>
            </div>
          </div>
          <ul className="mt-3 space-y-2">
            <li className="flex items-center gap-2 rounded-xl bg-paper px-3 py-2.5 text-sm text-ink">
              <span className="text-coral" aria-hidden="true">
                ×
              </span>
              {t("learn.flags.returns")}
            </li>
            <li className="flex items-center gap-2 rounded-xl bg-paper px-3 py-2.5 text-sm text-ink">
              <span className="text-coral" aria-hidden="true">
                ×
              </span>
              {t("learn.flags.manage")}
            </li>
            <li className="flex items-center gap-2 rounded-xl bg-paper px-3 py-2.5 text-sm text-ink">
              <span className="text-coral" aria-hidden="true">
                ×
              </span>
              {t("learn.flags.words")}
            </li>
          </ul>
          <p className="mt-3 text-[13px] leading-5 text-slate">{t("learn.scamClose")}</p>
          <button
            type="button"
            className="btn btn-ghost mt-3 text-sm"
            onClick={() => setActiveTopicId("risks-and-scams")}
          >
            {t("learn.openScamLesson")}
          </button>
        </section>
      </ScrollReveal>

      <ScrollReveal>
        <section className="rounded-[20px] border border-sand/70 bg-gradient-to-br from-paper to-pearl p-5 shadow-card">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-terracotta uppercase">
            {t("learn.nextEyebrow")}
          </p>
          <h2 className="mt-1 text-base font-semibold text-ink">{t("learn.nextTitle")}</h2>
          <p className="mt-1 text-sm leading-6 text-slate">{t("learn.nextBody")}</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link href="/habit" className="btn btn-accent flex-1 justify-center text-center">
              {t("learn.goHabit")}
            </Link>
            <Link href="/invest" className="btn btn-ghost flex-1 justify-center text-center">
              {t("learn.goInvest")}
            </Link>
          </div>
        </section>
      </ScrollReveal>

      <p className="text-xs leading-5 text-slate">{PAST_PERFORMANCE_DISCLAIMER}</p>
    </main>
  );
}

function TopicCard({
  topic,
  completed,
  onSelect,
  startLabel,
  doneLabel,
}: {
  topic: LearnTopic;
  completed: boolean;
  onSelect: () => void;
  startLabel: string;
  doneLabel: string;
}) {
  const coverKey = topic.beats[0]?.imageKey ?? "sensi";
  return (
    <article className="flex flex-col rounded-[18px] border border-mint/50 bg-paper p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-3 w-full max-w-[120px]">
        <LearnIllustration imageKey={coverKey} alt={topic.title} className="max-w-[120px]" />
      </div>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">{topic.title}</h3>
        {completed ? (
          <span className="shrink-0 rounded-full bg-mint px-2 py-0.5 text-[10px] font-semibold text-pine">
            {doneLabel}
          </span>
        ) : null}
      </div>
      <p className="mt-1 flex-1 text-xs leading-5 text-slate">{topic.summary}</p>
      <p className="mt-2 text-[11px] italic text-slate/90">{topic.commonQuestion}</p>
      <button type="button" className="btn btn-accent mt-3 w-full justify-center py-2.5 text-sm" onClick={onSelect}>
        {startLabel}
      </button>
    </article>
  );
}

export default function LearnPage() {
  return (
    <Suspense>
      <LearnPageContent />
    </Suspense>
  );
}

function ScrollReveal({ children }: { children: ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      }`}
    >
      {children}
    </div>
  );
}
