import type { LearnSource } from "./types";

/**
 * Reputable educational sources only.
 * Do not invent citations — keep this list short and verifiable.
 */
export const LEARN_SOURCES: Record<string, LearnSource> = {
  bitcoinOrg: {
    id: "bitcoinOrg",
    name: "bitcoin.org — Getting started",
    url: "https://bitcoin.org/en/getting-started",
    note: "Clear beginner overview of Bitcoin as money and how to get started safely.",
  },
  whitepaper: {
    id: "whitepaper",
    name: "Bitcoin whitepaper (Satoshi Nakamoto, 2008)",
    url: "https://bitcoin.org/bitcoin.pdf",
    note: "Original paper describing a peer-to-peer electronic cash system.",
  },
  bitcoinOrgVocab: {
    id: "bitcoinOrgVocab",
    name: "bitcoin.org — Vocabulary",
    url: "https://bitcoin.org/en/vocabulary",
    note: "Plain definitions for wallet, private key, address, and related terms.",
  },
  bitcoinOrgProtect: {
    id: "bitcoinOrgProtect",
    name: "bitcoin.org — Secure your wallet",
    url: "https://bitcoin.org/en/secure-your-wallet",
    note: "Guidance on protecting keys and recovery phrases.",
  },
  lightningDev: {
    id: "lightningDev",
    name: "Lightning Network overview (lightning.network)",
    url: "https://lightning.network/",
    note: "High-level explanation of Lightning as a payment layer on Bitcoin.",
  },
  bisCbdcs: {
    id: "bisCbdcs",
    name: "BIS — Annual Economic Report (crypto risks context)",
    url: "https://www.bis.org/publ/arpdf/ar2022e3.htm",
    note: "Institutional discussion of crypto volatility and consumer-protection themes (education context only).",
  },
};

export function sourcesForIds(ids: string[]): LearnSource[] {
  const out: LearnSource[] = [];
  for (const id of ids) {
    const source = LEARN_SOURCES[id];
    if (source) out.push(source);
  }
  return out;
}
