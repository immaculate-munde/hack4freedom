"use client";

import { useState } from "react";
import Link from "next/link";
import {
  sourcesForIds,
  type LearnChoice,
  type LearnTopic,
} from "@pesasense/core";
import { SensiAvatar } from "../sensi-avatar";
import { LearnIllustration } from "./topic-illustrations";

export function LessonPlayer({
  topic,
  onExit,
  onComplete,
}: {
  topic: LearnTopic;
  onExit: () => void;
  onComplete: (topicId: string) => void;
}) {
  const [beatIndex, setBeatIndex] = useState(0);
  const [selected, setSelected] = useState<LearnChoice | null>(null);
  const beat = topic.beats[beatIndex];
  const sources = sourcesForIds(topic.sourceIds);
  const isLast = beatIndex >= topic.beats.length - 1;

  if (!beat) {
    return (
      <div className="rounded-[20px] border border-sand/70 bg-paper p-5">
        <p className="text-sm text-slate">This lesson could not be loaded.</p>
        <button type="button" className="btn btn-ghost mt-3" onClick={onExit}>
          Back to topics
        </button>
      </div>
    );
  }

  const canAdvance =
    !beat.choices?.length || (selected !== null && selected.correct);

  const goNext = () => {
    if (!canAdvance) return;
    if (isLast) {
      onComplete(topic.id);
      return;
    }
    setBeatIndex((i) => i + 1);
    setSelected(null);
  };

  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-brass uppercase">
            {topic.level === "beginner" ? "Beginner" : "Intermediate"}
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-ink">{topic.title}</h2>
          <p className="mt-1 text-sm text-slate">{topic.commonQuestion}</p>
        </div>
        <button type="button" className="btn btn-ghost shrink-0 text-sm" onClick={onExit}>
          Topics
        </button>
      </div>

      <div className="flex items-center gap-2" aria-label="Lesson progress">
        {topic.beats.map((b, i) => (
          <span
            key={b.id}
            className={`h-1.5 flex-1 rounded-full ${
              i <= beatIndex ? "bg-moss" : "bg-sand"
            }`}
          />
        ))}
      </div>

      <LearnIllustration imageKey={beat.imageKey} alt={beat.imageAlt} />

      <div className="rounded-[20px] border border-mint/50 bg-mint/15 p-4 shadow-card">
        <div className="flex items-start gap-3">
          <SensiAvatar size="sm" mood={selected?.correct ? "celebrating" : "happy"} />
          <div className="min-w-0 space-y-2">
            {beat.question ? (
              <p className="text-xs font-semibold tracking-wide text-moss uppercase">
                {beat.question}
              </p>
            ) : null}
            <p className="text-sm leading-6 text-ink">{beat.sensiSays}</p>
            {beat.body ? <p className="text-sm leading-6 text-slate">{beat.body}</p> : null}
          </div>
        </div>
      </div>

      {beat.choices?.length ? (
        <div className="space-y-2" role="group" aria-label="Check your understanding">
          {beat.choices.map((choice) => {
            const pressed = selected?.id === choice.id;
            const showState = pressed;
            return (
              <button
                key={choice.id}
                type="button"
                aria-pressed={pressed}
                onClick={() => setSelected(choice)}
                className={`btn flex min-h-12 w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm ${
                  showState
                    ? choice.correct
                      ? "border-moss bg-mint text-pine"
                      : "border-coral/50 bg-coral/10 text-ink"
                    : "border-line bg-paper text-ink"
                }`}
              >
                {choice.label}
                <span
                  aria-hidden="true"
                  className={`h-4 w-4 shrink-0 rounded-full border ${
                    showState
                      ? choice.correct
                        ? "border-teal bg-teal"
                        : "border-coral bg-coral"
                      : "border-line"
                  }`}
                />
              </button>
            );
          })}
          {selected ? (
            <p
              className={`text-sm leading-6 ${
                selected.correct ? "text-pine" : "text-slate"
              }`}
              role="status"
            >
              {selected.feedback}
            </p>
          ) : null}
        </div>
      ) : null}

      {isLast ? (
        <div className="rounded-2xl border border-sand/70 bg-pearl/80 p-4">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-slate uppercase">
            Sources
          </p>
          <ul className="mt-2 space-y-2">
            {sources.map((source) => (
              <li key={source.id} className="text-sm leading-5 text-slate">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-teal underline underline-offset-2"
                >
                  {source.name}
                </a>
                <span className="block text-xs text-slate/90">{source.note}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          className="btn btn-accent flex-1 justify-center py-3"
          disabled={!canAdvance}
          onClick={goNext}
        >
          {isLast ? "Finish topic" : "Next"}
        </button>
        {isLast ? (
          <Link href="/habit" className="btn btn-ghost flex-1 justify-center py-3 text-center">
            See Habit path
          </Link>
        ) : null}
      </div>
    </section>
  );
}
