import { describe, expect, it } from "vitest";
import {
  LEARN_TOPICS,
  formatTelegramBeat,
  formatTelegramTopicMenu,
  getLearnTopic,
  parseTelegramTopicChoice,
  sourcesForIds,
} from "./index";

describe("learn knowledge base", () => {
  it("has the starter topics with beats and cited sources", () => {
    expect(LEARN_TOPICS.length).toBeGreaterThanOrEqual(7);
    for (const topic of LEARN_TOPICS) {
      expect(topic.beats.length).toBeGreaterThanOrEqual(2);
      expect(topic.sourceIds.length).toBeGreaterThan(0);
      expect(sourcesForIds(topic.sourceIds).length).toBe(topic.sourceIds.length);
      expect(topic.commonQuestion.length).toBeGreaterThan(10);
    }
  });

  it("formats a Telegram topic menu and beat without inventing sat counts", () => {
    const menu = formatTelegramTopicMenu();
    expect(menu).toMatch(/Learn Bitcoin with Sensi/);
    expect(menu).toMatch(/What is Bitcoin/);
    expect(menu).not.toMatch(/\d+\s*sats/i);

    const beat = formatTelegramBeat("what-is-bitcoin", 0);
    expect(beat).toMatch(/digital money/i);
    expect(beat).toMatch(/education, not financial advice/i);
  });

  it("parses Telegram topic choices by number and label", () => {
    expect(parseTelegramTopicChoice("1")).toBe("what-is-bitcoin");
    expect(parseTelegramTopicChoice("1. What is Bitcoin?")).toBe("what-is-bitcoin");
    expect(getLearnTopic("lightning-sending")?.title).toMatch(/Lightning/i);
  });
});
