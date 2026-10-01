# PesaSense

A private, on-device financial profile and a small Bitcoin habit for Kenya.

A private, on-device financial profile that helps someone in Kenya start a small Bitcoin habit, without trading and without the app holding their money.

Built for the Hack for Freedom hackathon in Nairobi.

## The problem

Two gaps came up in interviews and in a small survey called "Your Money, Your Choices" (11 responses, self-selected, so treat it as direction, not proof).

People are curious about investing, including Bitcoin, but do not know where to start, how much they need, or whether it is safe. Many assume they need a large amount of capital. Knowing about something is different from acting on it.

Trust is the harder gap. Past scams, unclear regulation and volatility make people reasonably cautious. Many believe Bitcoin is a scam because they do not understand it. An app that asks for money before it earns trust will fail.

M-Pesa already holds the financial life of millions of people, but that history sits there unused. People cannot easily see their burn rate, or how much they could safely put aside. Most finance tools describe the money and stop.

Most of the people we heard from already save, mainly in M-Shwari, Ziidi, banks, money market funds and SACCOs. Those products are the real alternative, not "doing nothing".

## The solution

The financial profile is the product. It is one structured object, built on the person's own device from about six months of history. Every other feature reads from it. It describes. It does not score or label anyone.

Six months is enough to see monthly rent and other repeating costs. Things that happen once or twice a year, such as termly school fees, are shown with a confidence level the person can confirm or correct.

### How it works

1. **Onboarding.** A few questions the statements cannot answer: debts, chama memberships, and the person's own goal.
2. **Ingest.** They paste M-Pesa SMS receipts, or upload an M-Pesa statement PDF. Decryption and parsing happen in the browser. The PDF password is whatever they type. The app does not assume it is a national ID or a Safaricom code.
3. **Profile.** The app shows income, repeating commitments, spending, resilience, and a safe surplus range. The floor of that range is the worst typical month.
4. **Learn.** A short education flow places Bitcoin next to options they may already use.
5. **Plan.** They choose a small repeating amount and cadence, capped below the surplus floor.
6. **Invest.** They buy Bitcoin inside the app through a partner on-ramp. The sats go to a wallet they control. They approve each purchase themselves.
7. **Track.** The app records purchases and reads new wallet activity back into the profile.

The demo path for the hackathon is: statement in, profile out, plan set, first purchase, encrypted save.

## Principles

- **Non-custodial.** PesaSense never holds funds or private keys. The person holds their keys.
- **Accumulate, do not trade.** Scheduled small buys only. No price alerts, candlestick charts, sell prompts, order books or leverage.
- **Manual approval.** Every purchase needs an explicit yes.
- **Privacy by design.** Raw statements and transactions stay on the device. The platform stores no raw file and no password. A profile is encrypted before any sync.
- **Explicit, user-initiated access only.** No background scraping of SMS. Kenya's Data Protection Act 2019 applies.
- **No model sees raw transactions.** Categories start from deterministic rules. If a model is ever used, it may see merchant name strings only, never amounts or identifiers.
- **Education, not advice.** The wording is "here is how Bitcoin has behaved historically", not "here is what we project for you".
- **Ranges, never a single prediction.** Scenarios show low, median and high.
- **Honest about fit.** If someone needs quick returns or full liquidity, the app should say Bitcoin is not the right fit.
- **No commission on purchases.** The working revenue assumption is freemium plus a subscription.

## Features

| Area                | What it does                                                                         | Hackathon status                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Ingestion           | Paste SMS or upload a statement. Output a list of transactions.                      | Stub. SMS fixtures and an encrypted demo PDF are ready.                                          |
| Profile and surplus | Income, commitments, spending, resilience, surplus range.                            | Contract, Amina's profile, and a thin buffer-first profile. Engine spec is in `profile.spec.ts`. |
| Education           | Buffer, then everyday saving, then a long horizon.                                   | Not built yet.                                                                                   |
| Scenarios           | Client-side historical range from a bundled Bitcoin price file.                      | Stub. No invented backtest numbers.                                                              |
| Investing           | Non-custodial buy via Bitika; sats to pasted address or in-app Breez wallet.        | **`/invest` flow** with quote, M-Pesa collect (sandbox/live), status polling.                    |
| In-app wallet       | Breez SDK Spark in the browser. Create, restore, balance, Lightning receive.         | **`/wallet`**, recovery backup (copy + download). Withdraw: pay `07…@bitcoin.co.ke` in-app.      |
| App shell           | Surplus home, invest, wallet.                                                        | Desktop sidebar + mobile bottom nav.                                                             |
| Nostr               | Encrypt the profile (NIP-44). One anonymous aggregate job (NIP-90).                  | Save and load are stubs.                                                                         |
| Chama ledger        | Records who paid whom. Never holds money. One member cannot move another's sats.    | **`/chama`**. Demo addresses record only. A real address is paid from that member's Breez wallet. |
| Reliability badge   | Opt-in note after a chama round. Not published.                                      | Mock on `/chama`, after a round finishes.                                                        |

Crypto history import is a stretch. USSD, Telegram, WhatsApp, and spending Bitcoin through other apps are out of scope for the hackathon.

## Architecture

TypeScript end to end. Sensitive data stays on the device.

| Layer              | Choice                                                                   |
| ------------------ | ------------------------------------------------------------------------ |
| Repo               | pnpm workspaces                                                          |
| Web app            | Next.js App Router, as a PWA, Tailwind                                   |
| PDF decryption     | pdf.js in the browser (not wired yet)                                    |
| Parser and profile | `packages/core`, tested with Vitest. No UI code.                         |
| Local storage      | IndexedDB via Dexie, encrypted with WebCrypto (not wired yet)            |
| Charts             | Recharts (not wired yet)                                                 |
| Scenarios          | Bundled BTC price CSV, client-side (not added yet)                       |
| Nostr              | nostr-tools, after we verify current NIP support                         |
| On-ramp            | `BitcoinOnRamp` + **Bitika** adapter (`packages/wallet`, Next API routes) |
| In-app wallet      | **Breez SDK Spark** (WASM, `next dev --webpack`)                          |
| Backend            | Next.js route handlers only, and Postgres just for a future chama ledger |
| Hosting            | Vercel                                                                   |

```
apps/web/          PWA
packages/core/     parser, profile, surplus, scenarios
packages/nostr/    encrypted profile storage
packages/wallet/   on-ramp interface, mock, Bitika adapter, phone/LN helpers
```

Money is whole Kenyan shillings. The shared contract is `packages/core/src/financial-profile.schema.ts`. It has no trading fields.

The component kit for later screens is shadcn/ui. The first screen is plain Tailwind so the surplus range can be reviewed without that setup.

## Getting started

You need Node.js 20 or newer. This repo pins pnpm through Corepack.

```bash
corepack enable
corepack prepare pnpm@10.18.0 --activate
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The home screen loads an invented profile (Amina) and shows her surplus range, with a **Demo data** badge. Add `?profile=brian` to see the thin profile, where the buffer has to come first.

**Invest and wallet (local):** copy `apps/web/.env.example` to `apps/web/.env.local` and set:

- `BITIKA_API_KEY` — sandbox `bk_test_…` for dev (see `docs/bitika-api.md`)
- `NEXT_PUBLIC_BREEZ_API_KEY` — from [Breez SDK](https://breez.technology/request-api-key/)

The web app runs with **webpack** (required for Breez WASM): `pnpm dev` in the repo uses `next dev --webpack` under `apps/web`.

Set `PROFILE_SOURCE=parsed` to turn the demo profiles off. That path calls the parser and does not fall back to the hand-written numbers. Until those functions exist, the screen says no profile has been built yet.

```bash
pnpm test
pnpm typecheck
pnpm lint
```

`pnpm dev` runs the web app. `pnpm test` runs Vitest across the packages. The profile acceptance spec is skipped until `buildProfile` stops throwing, then it runs with the rest.

The SMS fixtures follow published M-Pesa receipt shapes, including reversals, a failed send, Fuliza, and a withdrawal whose date comes before the word "Withdraw". The encrypted statement is `packages/core/src/fixtures/statements/amina-statement.pdf`. Its demo password is `demo-statement`, not a national ID.

All fixtures are synthetic. Do not replace them with a real M-Pesa statement.

## Project status

Hackathon demo path is **partially live**: surplus (demo profiles), **invest (Bitika)**, and **in-app wallet (Breez)** work in the browser. Parsing, real profile engine, education, scenarios, and Nostr sync are still stubs.

**In the repo now**

- pnpm monorepo, shared TypeScript, ESLint, Prettier and Vitest
- Transaction, confidence and shilling-range types, plus the financial profile contract
- Three fake M-Pesa SMS fixtures, one encrypted statement PDF, Amina's profile, and Brian's thin profile
- PWA with **AppShell** (mobile tabs + desktop sidebar), home surplus, **`/invest`**, **`/wallet`**
- **Bitika on-ramp**: `BitikaBitcoinOnRamp`, exchange-rate fallback, API routes, invest UI with sandbox badge
- **Breez wallet**: create/restore, Lightning address, balance, in-app withdraw to `07…@bitcoin.co.ke`, seed backup download
- **Chama mock** (`/chama`): Chama Sisters records direct payments to the member whose turn it is. The ledger never holds sats. Reliability note is opt-in and local.
- `docs/bitika-api.md` and Vitest coverage for wallet/on-ramp helpers
- Acceptance test for `buildProfile()` (skipped until the profile engine exists)

**Still stubbed or not wired**

- SMS/PDF parsing and `buildProfile()` engine (`PROFILE_SOURCE=parsed` shows "no profile")
- Education, scenarios, `WalletEvent` persistence on the profile
- NIP-44 save/load (chama reliability note is a local mock, not a published NIP-58 badge)
- Bitika webhooks (status polling only)

**On-ramp / wallet notes**

- **Invest** = Bitika M-Pesa → sats to a Lightning address (external paste or Breez in-app address).
- **Withdraw** = Breez sends sats to bitcoin.co.ke; KES on M-Pesa is their rail, not PesaSense custody.
- Bitika **sandbox** simulates payment; it may not fund a real Breez balance — use live keys and real sats for a full withdraw demo.

**Cut for the hackathon**

- USSD and Telegram
- Solana, Sui and Base as real features
- Spending Bitcoin through third parties

## Regulation and privacy

Shown later, before any investing prompt. Copy below is from team research and is marked **to verify**. Do not call a partner "licensed" unless that is confirmed.

- **To verify:** CBK licenses providers that handle custodial wallets, payment processing and fiat-to-crypto rails. CMA oversees exchanges, brokers and investment managers.
- **To verify:** Holding Bitcoin in a non-custodial wallet, peer-to-peer transfers and mining currently sit outside direct licensing.
- **To verify:** Kenya's Virtual Asset Service Providers Act (2025) is the licensing framework. Team research puts the compliance deadline for existing operators at **4 November 2026**.
- PesaSense is advisory and non-custodial. It should state the compliance status of its on-ramp partner in plain language.

Other items we will not guess:

- Bitika collect/status: see `docs/bitika-api.md`. Interface: `getQuote`, `startPurchase`, `checkStatus`.
- M-Pesa PDF password: user input. Not assumed.
- In-app wallet: **Breez SDK Spark**; users can still paste an external Lightning address on invest.
- Do not add statistics, including about chama usage, without a source.

Raw statement text is device-only. Kenya's Data Protection Act 2019 applies. Access to messages is explicit and started by the user.

## Team lanes

Six people can work in parallel against the stubs:

1. Parser (`packages/core` ingestion)
2. Profile engine (`packages/core` profile and surplus) — critical path
3. App shell and onboarding (`apps/web`)
4. Invest and learn screens (`apps/web`)
5. Wallet and on-ramp (`packages/wallet`)
6. Nostr and chama (`packages/nostr`, and later a Postgres ledger)

### Where to start

1. **Parser.** SMS shapes are in `packages/core/src/fixtures/sms/`. The PDF and its password are in `statement-fixture.ts`. Do not invent a password rule.
2. **Profile engine.** `packages/core/src/profile.spec.ts` is the spec. It is skipped while `buildProfile` throws. When it runs, Amina's and Brian's hand-written profiles are what the SMS should come close to. Do not edit those JSON files to match a wrong result.
3. **App shell and learn screens.** `/?profile=brian` is the "not ready yet" case. `PROFILE_SOURCE=parsed` is the switch off demo data.
4. **Invest and wallet.** Bitika + Breez paths are implemented; extend with profile `WalletEvent`s and webhooks as needed.
5. **Nostr.** Save/load stubs remain.

### Working together

- Keep `packages/core` free of UI code.
- Keep the types in `financial-profile.schema.ts` stable. Other packages depend on them.
- Use whole KES integers.
- Use the synthetic fixtures. Never commit real personal data.
- If something is unknown, code against the interface, ship a mock, and leave a `TODO` that names the missing piece.
- Ask before a large architectural choice this document does not already settle.
- Small commits. Say what changed and why.

## Roadmap

After the hackathon, not instead of the demo path:

- WhatsApp and Telegram for quick SMS forwarding and chama actions
- A USSD fallback for feature phones
- A multi-chain advisory layer and other assets, still without trading and still without holding funds

## Disclaimer

PesaSense provides education, not financial advice. Bitcoin can lose value. Past performance does not indicate future results.
