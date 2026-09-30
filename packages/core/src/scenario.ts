/**
 * Historical scenarios.
 *
 * Answers one question on the device: if someone had bought a fixed amount
 * on a fixed schedule, what spread of outcomes shows up in past windows?
 * The result is always low, median and high, with the disclaimer.
 */

import {
  PAST_PERFORMANCE_DISCLAIMER,
  type BuyCadence,
  type ScenarioResult,
} from "./financial-profile.schema";

/** One row from the bundled BTC price CSV, priced in KES. */
export interface PricePoint {
  /** ISO date. */
  date: string;
  priceKes: number;
}

/** The habit to replay across historical windows. */
export interface RunScenarioInput {
  amountKes: number;
  cadence: BuyCadence;
  years: number;
  /**
   * Bundled historical prices. Empty until the CSV is added.
   * TODO: ship a BTC-KES CSV and run the rolling window on the client.
   */
  prices: readonly PricePoint[];
}

/**
 * Run a rolling-window backtest for a scheduled buy.
 * Returns a spread, not a forecast. Past performance does not indicate future results.
 *
 * TODO: implement the window math against `prices`. Do not invent a result.
 */
export function runScenario(input: RunScenarioInput): ScenarioResult {
  throw new Error(
    `Not implemented: runScenario (${input.amountKes} KES ${input.cadence} for ${input.years} years, ${input.prices.length} prices). ${PAST_PERFORMANCE_DISCLAIMER}`,
  );
}
