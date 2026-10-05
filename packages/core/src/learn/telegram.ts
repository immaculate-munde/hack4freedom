import { PAST_PERFORMANCE_DISCLAIMER } from "../financial-profile.schema";
import { sourcesForIds } from "./sources";
import { LEARN_TOPICS, getLearnTopic } from "./topics";
import type { LearnBeat, LearnTopic } from "./types";

/** Footer shown on Telegram learn messages. */
export const TELEGRAM_LEARN_DISCLAIMER =
  "Education, not financial advice. Bitcoin can lose value.";

export function formatTelegramTopicMenu(): string {
  const lines = [
    "Learn Bitcoin with Sensi",
    "",
    "Pick a topic. Short lessons — no statement, no purchase.",
    "",
  ];
  LEARN_TOPICS.forEach((topic, index) => {
    lines.push(`${index + 1}. ${topic.title}`);
  });
  lines.push("", TELEGRAM_LEARN_DISCLAIMER);
  return lines.join("\n");
}

export function telegramTopicMenuKeyboard(): string[][] {
  const rows: string[][] = LEARN_TOPICS.map((topic, index) => [
    `${index + 1}. ${topic.title}`,
  ]);
  rows.push(["Back to menu"]);
  return rows;
}

export function telegramTopicLabel(topic: LearnTopic, index: number): string {
  return `${index + 1}. ${topic.title}`;
}

export function parseTelegramTopicChoice(text: string): string | null {
  const trimmed = text.trim();
  for (let i = 0; i < LEARN_TOPICS.length; i++) {
    const topic = LEARN_TOPICS[i]!;
    const label = telegramTopicLabel(topic, i);
    if (trimmed === label || trimmed === String(i + 1) || trimmed === topic.title) {
      return topic.id;
    }
  }
  return null;
}

function formatSources(topic: LearnTopic): string {
  const sources = sourcesForIds(topic.sourceIds);
  if (sources.length === 0) return "";
  const lines = ["", "Sources:"];
  for (const source of sources) {
    lines.push(`• ${source.name}`);
    lines.push(`  ${source.url}`);
  }
  return lines.join("\n");
}

function formatChoices(beat: LearnBeat): string {
  if (!beat.choices?.length) return "";
  const lines = ["", "Tap an answer:"];
  beat.choices.forEach((choice, index) => {
    const letter = String.fromCharCode(65 + index); // A, B, C
    lines.push(`${letter}) ${choice.label}`);
  });
  return lines.join("\n");
}

export function formatTelegramBeat(topicId: string, beatIndex: number): string | null {
  const topic = getLearnTopic(topicId);
  if (!topic) return null;
  const beat = topic.beats[beatIndex];
  if (!beat) return null;

  const parts: string[] = [`${topic.title}`, ""];
  if (beat.question) {
    parts.push(beat.question, "");
  }
  parts.push(beat.sensiSays);
  if (beat.body) {
    parts.push("", beat.body);
  }
  parts.push(formatChoices(beat));

  const isLast = beatIndex >= topic.beats.length - 1;
  if (isLast) {
    parts.push(formatSources(topic));
  }

  parts.push("", TELEGRAM_LEARN_DISCLAIMER);
  return parts.filter((p, i, arr) => !(p === "" && arr[i - 1] === "")).join("\n");
}

export function formatTelegramChoiceFeedback(
  topicId: string,
  beatIndex: number,
  choiceId: string,
): string | null {
  const topic = getLearnTopic(topicId);
  const beat = topic?.beats[beatIndex];
  const choice = beat?.choices?.find((c) => c.id === choiceId);
  if (!choice) return null;
  const mark = choice.correct ? "✓" : "×";
  return [`${mark} ${choice.feedback}`, "", TELEGRAM_LEARN_DISCLAIMER].join("\n");
}

export function parseTelegramAnswerChoice(
  topicId: string,
  beatIndex: number,
  text: string,
): string | null {
  const topic = getLearnTopic(topicId);
  const beat = topic?.beats[beatIndex];
  if (!beat?.choices?.length) return null;
  const trimmed = text.trim();
  for (let i = 0; i < beat.choices.length; i++) {
    const choice = beat.choices[i]!;
    const letter = String.fromCharCode(65 + i);
    if (
      trimmed === choice.label ||
      trimmed === letter ||
      trimmed === `${letter})` ||
      trimmed === `${letter}) ${choice.label}` ||
      trimmed.toLowerCase() === choice.id
    ) {
      return choice.id;
    }
  }
  return null;
}

export function telegramBeatKeyboard(
  topicId: string,
  beatIndex: number,
): string[][] {
  const topic = getLearnTopic(topicId);
  if (!topic) return [["More topics"], ["Back to menu"]];
  const beat = topic.beats[beatIndex];
  const rows: string[][] = [];

  if (beat?.choices?.length) {
    for (const choice of beat.choices) {
      rows.push([choice.label]);
    }
  }

  const isLast = beatIndex >= topic.beats.length - 1;
  if (isLast) {
    rows.push(["More topics"], ["Start a small habit"]);
  } else {
    rows.push(["Next"], ["More topics"]);
  }
  return rows;
}

export function telegramLearnEndKeyboard(): string[][] {
  return [["More topics"], ["Start a small habit"], ["Ask something else"]];
}

/** Total interactive beats across all topics (useful for progress copy). */
export function countLearnBeats(): number {
  return LEARN_TOPICS.reduce((sum, topic) => sum + topic.beats.length, 0);
}

export function learnDisclaimer(): string {
  return PAST_PERFORMANCE_DISCLAIMER;
}
