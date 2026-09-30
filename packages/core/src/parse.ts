/**
 * Statement ingestion.
 *
 * Turns pasted M-Pesa SMS receipts, or text extracted from a statement PDF,
 * into Transaction objects. Rules and regex come first. No model sees the raw text.
 * Decryption happens in the browser before this module is called.
 */

import type { Transaction } from "./types";

/** Text the browser has already extracted from a decrypted statement. */
export interface ParseStatementInput {
  text: string;
  source: "mpesa_pdf" | "bank_pdf";
}

/**
 * Parse text extracted from an M-Pesa or bank statement.
 *
 * The PDF is decrypted in the browser before this runs. The password is
 * whatever the user types. Do not assume it is a national ID or a code
 * Safaricom sends.
 *
 * TODO: recognize Paybill, Buy Goods, Sent To, Received, Fuliza and airtime.
 */
export function parseStatement(input: ParseStatementInput): Transaction[] {
  throw new Error(
    `Not implemented: parseStatement (${input.source}, ${input.text.length} chars)`,
  );
}

/**
 * Parse a batch of pasted M-Pesa SMS receipts.
 * Each string is one message. Empty messages are ignored once this is built.
 *
 * TODO: same keyword rules as parseStatement, applied per message.
 */
export function parseSmsBatch(messages: readonly string[]): Transaction[] {
  throw new Error(`Not implemented: parseSmsBatch (${messages.length} messages)`);
}
