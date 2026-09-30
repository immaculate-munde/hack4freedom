"use client";

import { generateMnemonic, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { MNEMONIC_STORAGE_KEY } from "./constants";

export function createNewMnemonic(): string {
  return generateMnemonic(wordlist, 128);
}

export function normalizeMnemonic(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

export function assertValidMnemonic(mnemonic: string): void {
  const normalized = normalizeMnemonic(mnemonic);
  if (!validateMnemonic(normalized, wordlist)) {
    throw new Error("That recovery phrase does not look valid. Check all 12 words.");
  }
}

export function loadStoredMnemonic(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(MNEMONIC_STORAGE_KEY);
  return raw ? normalizeMnemonic(raw) : null;
}

export function saveMnemonic(mnemonic: string): void {
  assertValidMnemonic(mnemonic);
  window.localStorage.setItem(MNEMONIC_STORAGE_KEY, normalizeMnemonic(mnemonic));
}

export function clearStoredMnemonic(): void {
  window.localStorage.removeItem(MNEMONIC_STORAGE_KEY);
}
