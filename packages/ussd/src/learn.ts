/**
 * Handset lessons from the same topics the web Learn page and Telegram use.
 * Titles stay short so the menu fits a 182-character screen.
 */

import { LEARN_TOPICS } from "@pesasense/core";
import type { UssdLang } from "./copy";

const LABELS: Record<string, { en: string; sw: string }> = {
  "what-is-bitcoin": { en: "What is Bitcoin", sw: "Bitcoin ni nini" },
  "why-save-bitcoin": { en: "Why save in Bitcoin", sw: "Kwa nini kuweka Bitcoin" },
  "wallets-and-keys": { en: "Wallets and keys", sw: "Mikoba na funguo" },
  "sats-and-small-amounts": { en: "Sats", sw: "Sats" },
  "lightning-sending": { en: "Lightning", sw: "Lightning" },
  "risks-and-scams": { en: "Risks and scams", sw: "Hatari na ulaghai" },
  "habit-to-invest": { en: "Habit then invest", sw: "Tabia kisha uwekezaji" },
};

export function ussdLearnMenu(lang: UssdLang): string {
  const lines = [lang === "sw" ? "Jifunze" : "Learn"];
  LEARN_TOPICS.forEach((topic, index) => {
    const label = LABELS[topic.id]?.[lang] ?? topic.title.replace(/\?$/, "");
    lines.push(`${index + 1} ${label}`);
  });
  lines.push(lang === "sw" ? "0 Toka" : "0 Exit");
  return lines.join("\n");
}

/** One-line summary from the shared topic. Null when the key is not a topic. */
export function ussdLearnLesson(input: string): string | null {
  if (!/^[1-9]$/.test(input)) return null;
  const topic = LEARN_TOPICS[Number(input) - 1];
  return topic?.summary ?? null;
}
