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

/**
 * Safe access to a regex capture group.
 * `noUncheckedIndexedAccess` makes `match[1]` possibly undefined.
 * This narrows it once so every caller does not have to.
 */
function group(match: RegExpMatchArray, index: number): string | undefined {
  const value = match[index];
  return typeof value === "string" ? value : undefined;
}

/** Extract a Ksh amount. Handles "Ksh15,000.00", "KSh8,000.00", "Ksh100.00". */
function extractAmount(text: string): number | null {
  const match = text.match(/K[Ss]h([\d,]+(?:\.\d{2})?)/);
  if (!match) return null;
  const raw = group(match, 1);
  if (raw === undefined) return null;
  const value = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(value)) return null;
  return Math.round(value); // whole KES
}

/** Extract ISO date from "on 2/4/26 at 8:12 AM" or "on 14/6/26 at 10:02 AM". */
function extractDate(text: string): string | null {
  const match = text.match(/on\s+(\d{1,2})\/(\d{1,2})\/(\d{2,4})/i);
  if (!match) return null;
  const day = group(match, 1);
  const month = group(match, 2);
  const yearRaw = group(match, 3);
  if (day === undefined || month === undefined || yearRaw === undefined) return null;
  const year = Number(yearRaw) < 100 ? 2000 + Number(yearRaw) : Number(yearRaw);
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/** Extract running balance if present. */
function extractBalance(text: string): number | undefined {
  const match = text.match(
    /(?:New M-PESA balance is|M-PESA balance is|New M-PESAbalance is)\s*K[Ss]h([\d,]+(?:\.\d{2})?)/i,
  );
  if (!match) return undefined;
  const raw = group(match, 1);
  if (raw === undefined) return undefined;
  return Math.round(Number(raw.replace(/,/g, "")));
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
    if (!match) continue;
    const captured = group(match, 1);
    if (captured !== undefined) return captured.trim();
  }
  return undefined;
}

/** One SMS → one Transaction, or null if the message is not a transaction. */
function parseOneMessage(
  message: string,
  index: number,
  previousDate?: string,
): Transaction | null {
  const trimmed = message.trim();

  // Skip failed transactions — no money moved.
  if (/^Failed\./i.test(trimmed)) return null;

  // Skip reversal notices — they reference a prior transaction.
  if (/has been reversed/i.test(trimmed)) return null;

  // Skip reversal-in-progress notices.
  if (/reversal request has been received/i.test(trimmed)) return null;

  // Fuliza follow-ups have no date in the message. Use the previous
  // transaction's date, since Fuliza fires on the same day as the purchase.
  const isFuliza = /Fuliza M-PESA amount of/i.test(trimmed);
  const isFulizaRepayment = /clear your outstanding Fuliza/i.test(trimmed);

  const date =
    extractDate(trimmed) ??
    (isFuliza || isFulizaRepayment ? previousDate : undefined);
  if (!date) return null;

  const balance = extractBalance(trimmed);
  const counterparty = extractCounterparty(trimmed);
  const id = `txn-${date}-${String(index).padStart(3, "0")}`;

  // ── Fuliza (loan usage — money out) ─────────────────────────
  if (isFuliza) {
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
  if (isFulizaRepayment) {
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
  let previousDate: string | undefined;

  for (const [index, message] of messages.entries()) {
    if (message.trim().length === 0) continue;
    const txn = parseOneMessage(message, index, previousDate);
    if (txn) {
      transactions.push(txn);
      previousDate = txn.date;
    }
  }

  // Sort by date ascending so downstream code sees history in order.
  return transactions.sort((a, b) => a.date.localeCompare(b.date));
}

/** Whole shillings from a statement column like "Withdrawn 15,000.00". */
function statementColumnAmount(text: string, label: string): number | undefined {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(
    new RegExp(`${escaped}\\s*:?\\s*([\\d,]+(?:\\.\\d{2})?)`, "i"),
  );
  if (!match) return undefined;
  const raw = group(match, 1);
  if (raw === undefined) return undefined;
  const value = Math.round(Number(raw.replace(/,/g, "")));
  return Number.isFinite(value) ? value : undefined;
}

function statementPaidIn(text: string): number | undefined {
  return (
    statementColumnAmount(text, "Paid in") ??
    statementColumnAmount(text, "Paid In") ??
    statementColumnAmount(text, "Money In") ??
    statementColumnAmount(text, "Money in") ??
    statementColumnAmount(text, "Credit")
  );
}

function statementWithdrawn(text: string): number | undefined {
  return (
    statementColumnAmount(text, "Withdrawn") ??
    statementColumnAmount(text, "Money Out") ??
    statementColumnAmount(text, "Money out") ??
    statementColumnAmount(text, "Debit")
  );
}

/** ISO date from common M-Pesa statement date fragments on one line. */
function extractStatementDate(line: string): string | null {
  const iso = line.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const dmy = line.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/);
  if (dmy) {
    const d = group(dmy, 1);
    const m = group(dmy, 2);
    const yRaw = group(dmy, 3);
    if (d === undefined || m === undefined || yRaw === undefined) return null;
    const year = Number(yRaw) < 100 ? 2000 + Number(yRaw) : Number(yRaw);
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  return null;
}

function firstKesAmount(line: string): number | undefined {
  const match = line.match(/(?:K[Ss]h|KES)\s*([\d,]+(?:\.\d{2})?)/i);
  if (!match) return undefined;
  const raw = group(match, 1);
  if (raw === undefined) return undefined;
  const value = Math.round(Number(raw.replace(/,/g, "")));
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

/** Last monetary columns on a statement row (often amount then balance). */
function trailingStatementAmount(line: string): number | undefined {
  const amounts: number[] = [];
  for (const match of line.matchAll(/\b([\d,]+\.\d{2})\b/g)) {
    const raw = group(match, 1);
    if (raw === undefined) continue;
    const value = Math.round(Number(raw.replace(/,/g, "")));
    if (Number.isFinite(value) && value >= 10 && value < 50_000_000) {
      amounts.push(value);
    }
  }
  if (amounts.length === 0) return undefined;
  if (amounts.length >= 2 && /balance/i.test(line)) {
    return amounts[amounts.length - 2];
  }
  return amounts[amounts.length - 1];
}

function rowLooksComplete(line: string): boolean {
  if (extractStatementDate(line) === null) return false;
  if (parseOneMessage(line, 0)) return true;
  return (
    statementPaidIn(line) !== undefined ||
    statementWithdrawn(line) !== undefined ||
    firstKesAmount(line) !== undefined ||
    trailingStatementAmount(line) !== undefined
  );
}

function looksLikeStatementRowStart(line: string): boolean {
  return /^[A-Z0-9]{6,}\s+(?:\d{4}-\d{2}-\d{2}|\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})\s+\d{1,2}:\d{2}/i.test(
    line,
  );
}

/** Safaricom PDFs often split one table row across several extracted lines. */
function mergeStatementLines(lines: readonly string[]): string[] {
  const merged: string[] = [];
  let buffer = "";

  const flush = () => {
    const text = buffer.replace(/\s+/g, " ").trim();
    buffer = "";
    if (text.length > 0) merged.push(text);
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (isStatementNoise(trimmed)) {
      flush();
      continue;
    }

    if (/^Confirmed\./i.test(trimmed)) {
      flush();
      merged.push(trimmed);
      continue;
    }

    if (looksLikeStatementRowStart(trimmed)) {
      flush();
      buffer = trimmed;
    } else if (!buffer) {
      buffer = trimmed;
    } else {
      buffer = `${buffer} ${trimmed}`;
    }

    if (rowLooksComplete(buffer) || buffer.length > 240) {
      flush();
    }
  }
  flush();
  return merged;
}

function isStatementNoise(line: string): boolean {
  return (
    /^Receipt(\s+No)?\b/i.test(line) ||
    /M-PESA STATEMENT/i.test(line) ||
    /^Customer:/i.test(line) ||
    /^Phone:/i.test(line) ||
    /^Period:/i.test(line) ||
    /^Summary\b/i.test(line) ||
    /^Opening\b/i.test(line) ||
    /^Closing\b/i.test(line) ||
    /^Total\b/i.test(line) ||
    /not a real statement/i.test(line) ||
    /^This is not a real person/i.test(line)
  );
}

/**
 * One tabular row from an M-Pesa statement PDF (Safaricom export shape).
 * Example: `QA10AA01  2026-04-02 08:12  Pay Bill to …  Withdrawn 15000.00  Balance 7400.00`
 */
function parseLooseStatementLine(line: string, index: number): Transaction | null {
  const trimmed = line.trim();
  if (trimmed.length < 12 || isStatementNoise(trimmed)) return null;
  if (/reversal of transaction/i.test(trimmed)) return null;

  const sms = parseOneMessage(trimmed, index);
  if (sms) return sms;

  const date = extractStatementDate(trimmed);
  if (!date) return null;

  const balanceKes = statementColumnAmount(trimmed, "Balance");
  const id = `stmt-loose-${index}-${date}`;
  const paidIn = statementPaidIn(trimmed);
  const withdrawn = statementWithdrawn(trimmed);
  const ksh = firstKesAmount(trimmed);

  if (/Fuliza/i.test(trimmed)) {
    const amount =
      withdrawn ??
      ksh ??
      (() => {
        const m = trimmed.match(/balance\s+([\d,]+(?:\.\d{2})?)/i);
        if (!m) return undefined;
        const raw = group(m, 1);
        if (raw === undefined) return undefined;
        return Math.round(Number(raw.replace(/,/g, "")));
      })();
    if (amount === undefined) return null;
    return {
      id,
      date,
      amountKes: amount,
      direction: "out",
      counterparty: "Fuliza",
      kind: "fuliza",
      balanceKes,
      raw: trimmed,
    };
  }

  if (
    paidIn !== undefined &&
    /(Customer Transfer|Receive|Received|Money In|Paid In|Salary|from\s+\d)/i.test(trimmed)
  ) {
    const counterparty =
      trimmed.match(/(?:from|to)\s+(\d{9,12}|\S.{2,40}?)(?:\s+Completed|\s+KES|\s+K[Ss]h|$)/i)?.[1]?.trim() ??
      "Transfer";
    return {
      id,
      date,
      amountKes: paidIn,
      direction: "in",
      counterparty,
      kind: "receive",
      balanceKes,
      raw: trimmed,
    };
  }

  if (withdrawn !== undefined && /Pay Bill/i.test(trimmed)) {
    const counterparty =
      trimmed.match(/Pay Bill to\s+(\d+)\s*-?\s*(.+?)(?:\s+Acc\.|\s+Completed|\s+KES)/i)?.[2]?.trim() ??
      "Pay bill";
    return {
      id,
      date,
      amountKes: withdrawn,
      direction: "out",
      counterparty,
      kind: "paybill",
      balanceKes,
      raw: trimmed,
    };
  }

  if (withdrawn !== undefined && /(Send Money|sent to|Withdraw|Agent|Pay Merchant|Buy Goods)/i.test(trimmed)) {
    return {
      id,
      date,
      amountKes: withdrawn,
      direction: "out",
      counterparty: "M-Pesa",
      kind: /Withdraw/i.test(trimmed) ? "withdraw" : "send",
      balanceKes,
      raw: trimmed,
    };
  }

  if (withdrawn !== undefined) {
    return {
      id,
      date,
      amountKes: withdrawn,
      direction: "out",
      counterparty: "M-Pesa",
      kind: "send",
      balanceKes,
      raw: trimmed,
    };
  }

  if (paidIn !== undefined) {
    return {
      id,
      date,
      amountKes: paidIn,
      direction: "in",
      counterparty: "M-Pesa",
      kind: "receive",
      balanceKes,
      raw: trimmed,
    };
  }

  const trailing = trailingStatementAmount(trimmed);
  if (trailing !== undefined) {
    const inbound =
      /(paid in|money in|customer transfer|received|from\s+\d{9})/i.test(trimmed) &&
      !/(withdrawn|money out|sent to|pay bill)/i.test(trimmed);
    if (inbound) {
      return {
        id,
        date,
        amountKes: trailing,
        direction: "in",
        counterparty: "M-Pesa",
        kind: "receive",
        balanceKes,
        raw: trimmed,
      };
    }
    if (/(withdrawn|money out|sent to|pay bill|send money|buy goods|airtime)/i.test(trimmed)) {
      return {
        id,
        date,
        amountKes: trailing,
        direction: "out",
        counterparty: "M-Pesa",
        kind: /pay bill/i.test(trimmed) ? "paybill" : "send",
        balanceKes,
        raw: trimmed,
      };
    }
  }

  if (ksh !== undefined && /(sent to|send money|pay bill|withdraw|bought airtime)/i.test(trimmed)) {
    return {
      id,
      date,
      amountKes: ksh,
      direction: /(received|from\s+\d|paid in|money in)/i.test(trimmed) ? "in" : "out",
      counterparty: "M-Pesa",
      kind: "send",
      balanceKes,
      raw: trimmed,
    };
  }

  return null;
}

function parseStatementRow(line: string, index: number): Transaction | null {
  const trimmed = line.trim();
  if (trimmed.length < 12 || isStatementNoise(trimmed)) return null;
  if (/^This is not a real person/i.test(trimmed)) return null;

  const match = trimmed.match(
    /^([A-Z0-9]{6,})\s+(\d{4}-\d{2}-\d{2})\s+\d{1,2}:\d{2}\s+(.+)$/i,
  );

  if (!match) {
    return parseLooseStatementLine(trimmed, index);
  }

  const receipt = group(match, 1) ?? `row-${index}`;
  const date = group(match, 2);
  const rest = group(match, 3);
  if (!date || !rest) return null;

  if (/reversal of transaction/i.test(rest)) return null;

  const balanceKes = statementColumnAmount(rest, "Balance");
  const id = `stmt-${receipt}-${date}`;

  if (/Fuliza M-PESA used/i.test(rest)) {
    const amount =
      statementColumnAmount(rest, "Balance") ??
      (() => {
        const m = rest.match(/balance\s+([\d,]+(?:\.\d{2})?)/i);
        if (!m) return null;
        const raw = group(m, 1);
        if (raw === undefined) return null;
        return Math.round(Number(raw.replace(/,/g, "")));
      })();
    if (amount === null || amount === undefined) return null;
    return {
      id,
      date,
      amountKes: amount,
      direction: "out",
      counterparty: "Fuliza",
      kind: "fuliza",
      balanceKes,
      raw: trimmed,
    };
  }

  const withdrawn = statementWithdrawn(rest);
  if (withdrawn !== undefined && /Pay Bill/i.test(rest)) {
    const counterparty =
      rest.match(/Pay Bill to\s+\d+\s*-\s*(.+?)(?:\s+Acc\.|\s+Completed)/i)?.[1]?.trim() ??
      "Pay bill";
    return {
      id,
      date,
      amountKes: withdrawn,
      direction: "out",
      counterparty,
      kind: "paybill",
      balanceKes,
      raw: trimmed,
    };
  }

  if (withdrawn !== undefined && /\bWithdraw\b/i.test(rest)) {
    return {
      id,
      date,
      amountKes: withdrawn,
      direction: "out",
      counterparty: "Agent",
      kind: "withdraw",
      balanceKes,
      raw: trimmed,
    };
  }

  const paidIn = statementPaidIn(rest);
  if (paidIn !== undefined && /Customer Transfer from/i.test(rest)) {
    const counterparty =
      rest.match(/Customer Transfer from\s+\d+\s*-\s*(.+?)(?:\s+Completed)/i)?.[1]?.trim() ??
      "Transfer";
    return {
      id,
      date,
      amountKes: paidIn,
      direction: "in",
      counterparty,
      kind: "receive",
      balanceKes,
      raw: trimmed,
    };
  }

  if (paidIn !== undefined && /\breceived from\b/i.test(rest)) {
    return {
      id,
      date,
      amountKes: paidIn,
      direction: "in",
      counterparty: "M-Pesa",
      kind: "receive",
      balanceKes,
      raw: trimmed,
    };
  }

  if (withdrawn !== undefined) {
    return {
      id,
      date,
      amountKes: withdrawn,
      direction: "out",
      counterparty: "M-Pesa",
      kind: "send",
      balanceKes,
      raw: trimmed,
    };
  }

  return null;
}

/**
 * Parse text extracted from an M-Pesa or bank statement.
 *
 * The PDF is decrypted in the browser before this runs. The password is
 * whatever the user types. Do not assume it is a national ID or a code
 * Safaricom sends.
 */
export function parseStatement(input: ParseStatementInput): Transaction[] {
  const rawLines = input.text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0);

  const lines = mergeStatementLines(rawLines);

  const fromRows: Transaction[] = [];
  for (const [index, line] of lines.entries()) {
    const txn = parseStatementRow(line, index);
    if (txn) fromRows.push(txn);
  }

  if (fromRows.length > 0) {
    return fromRows.sort((a, b) => a.date.localeCompare(b.date));
  }

  const smsLike = lines.filter((line) =>
    /(?:^Confirmed\.|K[Ss]h|KES|sent to|received|pay bill|fuliza|withdraw)/i.test(line),
  );
  if (smsLike.length > 0) {
    const perLine = parseSmsBatch(smsLike);
    if (perLine.length > 0) {
      return perLine.sort((a, b) => a.date.localeCompare(b.date));
    }
  }

  const confirmedChunks = input.text
    .split(/(?=\bConfirmed\.)/i)
    .map((m) => m.trim())
    .filter((m) => m.length > 0);
  if (confirmedChunks.length > 1) {
    const fromChunks = parseSmsBatch(confirmedChunks);
    if (fromChunks.length > 0) {
      return fromChunks.sort((a, b) => a.date.localeCompare(b.date));
    }
  }

  const messages = input.text
    .split(/\n\s*\n/)
    .map((m) => m.trim())
    .filter((m) => m.length > 0);

  return parseSmsBatch(messages);
}