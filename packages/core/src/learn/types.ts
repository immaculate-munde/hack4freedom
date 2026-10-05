/**
 * Shared Bitcoin education knowledge base.
 * Consumed by the web Learn page and Telegram (and ready for USSD later).
 * Education only — not financial advice.
 */

export type LearnLevel = "beginner" | "intermediate";

/** Well-known educational sources cited in lessons. */
export type LearnSource = {
  id: string;
  name: string;
  url: string;
  /** Short note on what this source is used for. */
  note: string;
};

/**
 * Illustration key. Web maps these to public assets / components.
 * Telegram ignores images and uses text only.
 */
export type LearnImageKey =
  | "sensi"
  | "sensi-ask"
  | "sensi-think"
  | "sensi-yes"
  | "bitcoin"
  | "keys"
  | "sats"
  | "lightning"
  | "shield"
  | "habit";

export type LearnChoice = {
  id: string;
  label: string;
  correct: boolean;
  feedback: string;
};

export type LearnBeat = {
  id: string;
  /** Common-question style prompt shown above Sensi's teaching. */
  question?: string;
  /** Sensi's short teaching line. */
  sensiSays: string;
  /** Extra plain-language body (optional). */
  body?: string;
  imageKey: LearnImageKey;
  imageAlt: string;
  /** Check-your-understanding choices (optional). */
  choices?: LearnChoice[];
};

export type LearnTopic = {
  id: string;
  level: LearnLevel;
  /** Short label for grids and Telegram buttons. */
  title: string;
  /** One-line summary for the topic picker. */
  summary: string;
  /** The everyday question this topic answers. */
  commonQuestion: string;
  /** Source ids from LEARN_SOURCES. */
  sourceIds: string[];
  beats: LearnBeat[];
};
