import { randomInt } from "node:crypto";

/** Six digits, including leading zeros. Single use, checked by the store. */
export function newLinkCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}
