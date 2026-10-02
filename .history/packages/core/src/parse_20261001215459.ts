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

// ─────────────────────────────────────────────────────────────
// Helpers — pure functions, no side effects
// ─────────────────────────────────────────────────────────────

/** Extract a Ksh amount. Handles "Ksh15,000.00", "KSh8,000.00", "Ksh100.00". */
function extractAmount(text: string): number | null {
  const match = text.match(/K[Ss]h([\d,]+(?:\.\d{2})?)/);
  if (!match) return null;
  const [, raw] = match;
  if (raw === undefined) return null;
  const value = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(value)) return null;
  return Math.round(value);
}
/** Extract ISO date from "on 2/4/26 at 8:12 AM" or "on 14/6/26 at 10:02 AM". */
function extractDate(text: string): string | null {
  const match = text.match(/on\s+(\d{1,2})\/(\d{1,2})\/(\d{2,4})/i);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const yearRaw = Number(match[3]);
  const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Extract running balance if present. */
function extractBalance(text: string): number | undefined {
  const match = text.match(
    /(?:New M-PESA balance is|M-PESA balance is|New M-PESAbalance is)\s*K[Ss]h([\d,]+(?:\.\d{2})?)/i,
  );
  if (!match || match[1] === undefined) return undefined;
  return Math.round(Number(match[1].replace(/,/g, "")));
}
/** Extract counterparty label from common M-Pesa phrasings. */
function extractCounterparty(text: string): string | undefined {
  const patterns = [
    /sent to\s+([A-Z][A-Z0-9 &.'-]+?)(?:\s+for account|\s+\d{10,}|\s+on\s)/i,
    /paid to\s+([A-Z][A-Z0-9 &.'-]+?)\.?(?:\s+on\s|\s*$)/i,
    /from\s+([A-Z][A-Z0-9 &.'-]+?)(?:\s+\d{10,}|\s+on\s)/i,
    /(?:to|from)\s+([A-Z][A-Z0-9 &.'-]+?)\s+\d{10,}/i,
    /Give\s+K[Ss]h.*cash to\s+([A-Z0-9 &.'-]+)/i,
    /Withdraw\s+K[Ss]h.*from\s+([A-Z0-9 &.'-]+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1] !== undefined) return match[1].trim();

  }
  return undefined;
}

/** One SMS → one Transaction, or null if the message is not a transaction. */
function parseOneMessage(message: string, index: number, previousDate?: string): Transaction | null {
  const trimmed = message.trim();

  // Skip failed transactions — no money moved.
  if (/^Failed\./i.test(trimmed)) return null;

  // Skip reversal notices — they reference a prior transaction.
  if (/has been reversed/i.test(trimmed)) return null;

  // Skip reversal-in-progress notices.
  if (/reversal request has been received/i.test(trimmed)) return null;

  const date = extractDate(trimmed);
  if (!date) return null;

  const balance = extractBalance(trimmed);
  const counterparty = extractCounterparty(trimmed);
  const id = `txn-${date}-${String(index).padStart(3, "0")}`;

  // ── Fuliza (loan usage — money out) ─────────────────────────
  if (/Fuliza M-PESA amount of/i.test(trimmed)) {
    const amount = extractAmount(trimmed);
    if (amount === null) return null;
    return {
      id,
      date,
      amountKes: amount,
      direction: "out",
      counterparty: counterparty ?? "Fuliza",
      kind: "fuliza",
      balanceKes: balance,
      raw: trimmed,
    };
  }

  // ── Fuliza repayment (money out) ────────────────────────────
  if (/clear your outstanding Fuliza/i.test(trimmed)) {
    const amount = extractAmount(trimmed);
    if (amount === null) return null;
    return {
      id,
      date,
      amountKes: amount,
      direction: "out",
      counterparty: "Fuliza",
      kind: "fuliza",
      balanceKes: balance,
      raw: trimmed,
    };
  }

  // ── Received money (money in) ──────────────────────────────
  if (/You have received/i.test(trimmed)) {
    const amount = extractAmount(trimmed);
    if (amount === null) return null;
    return {
      id,
      date,
      amountKes: amount,
      direction: "in",
      counterparty: counterparty ?? "Unknown",
      kind: "receive",
      balanceKes: balance,
      raw: trimmed,
    };
  }

  // ── M-Shwari transfer (money in — from savings) ────────────
  if (/transferred.*from your M-Shwari/i.test(trimmed)) {
    const amount = extractAmount(trimmed);
    if (amount === null) return null;
    return {
      id,
      date,
      amountKes: amount,
      direction: "in",
      counterparty: "M-Shwari",
      kind: "deposit",
      balanceKes: balance,
      raw: trimmed,
    };
  }

  // ── Withdrawal (money out) ─────────────────────────────────
  if (/Withdraw\s+K[Ss]h/i.test(trimmed)) {
    const amount = extractAmount(trimmed);
    if (amount === null) return null;
    return {
      id,
      date,
      amountKes: amount,
      direction: "out",
      counterparty: counterparty ?? "Agent",
      kind: "withdraw",
      balanceKes: balance,
      raw: trimmed,
    };
  }

  // ── Give cash (money out) ──────────────────────────────────
  if (/Give\s+K[Ss]h.*cash to/i.test(trimmed)) {
    const amount = extractAmount(trimmed);
    if (amount === null) return null;
    return {
      id,
      date,
      amountKes: amount,
      direction: "out",
      counterparty: counterparty ?? "Agent",
      kind: "withdraw",
      balanceKes: balance,
      raw: trimmed,
    };
  }

  // ── Airtime (money out) ────────────────────────────────────
  if (/bought\s+K[Ss]h.*of airtime/i.test(trimmed)) {
    const amount = extractAmount(trimmed);
    if (amount === null) return null;
    return {
      id,
      date,
      amountKes: amount,
      direction: "out",
      counterparty: "Airtime",
      kind: "airtime",
      balanceKes: balance,
      raw: trimmed,
    };
  }

  // ── Paid to (buy goods — money out) ────────────────────────
  if (/\bpaid to\b/i.test(trimmed)) {
    const amount = extractAmount(trimmed);
    if (amount === null) return null;
    return {
      id,
      date,
      amountKes: amount,
      direction: "out",
      counterparty: counterparty ?? "Merchant",
      kind: "buy_goods",
      balanceKes: balance,
      raw: trimmed,
    };
  }

  // ── Sent to (money out — rent, chama, loan, paybill) ───────
  if (/\bsent to\b/i.test(trimmed)) {
    const amount = extractAmount(trimmed);
    if (amount === null) return null;
    const isPaybill = /for account/i.test(trimmed);
    return {
      id,
      date,
      amountKes: amount,
      direction: "out",
      counterparty: counterparty ?? "Unknown",
      kind: isPaybill ? "paybill" : "send",
      balanceKes: balance,
      raw: trimmed,
    };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Parse a batch of pasted M-Pesa SMS receipts.
 * Each string is one message. Empty messages are ignored.
 */
export function parseSmsBatch(messages: readonly string[]): Transaction[] {
  const transactions: Transaction[] = [];

  for (const [index, message] of messages.entries()) {
    if (message.trim().length === 0) continue;
    const txn = parseOneMessage(message, index);
    if (txn) transactions.push(txn);
  }

  // Sort by date ascending so downstream code sees history in order.
  return transactions.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Parse text extracted from an M-Pesa or bank statement.
 *
 * The PDF is decrypted in the browser before this runs. The password is
 * whatever the user types. Do not assume it is a national ID or a code
 * Safaricom sends.
 *
 * For now, M-Pesa PDF rows use the same vocabulary as SMS rows
 * ("Pay Bill" differs from an SMS "for account" line, but the amount,
 * date and counterparty patterns overlap). We split the extracted text
 * on blank lines and reuse the SMS parser.
 *
 * TODO: handle "Pay Bill" and PDF-specific row shapes once the PDF
 * fixture is wired through pdf.js.
 */
export function parseStatement(input: ParseStatementInput): Transaction[] {
  const messages = input.text
    .split(/\n\s*\n/)
    .map((m) => m.trim())
    .filter((m) => m.length > 0);

  return parseSmsBatch(messages);
}