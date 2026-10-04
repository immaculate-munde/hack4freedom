# Architecture

PesaSense keeps raw financial history on the device and stays out of the payment path. This page is the trust map for the hackathon build. The product contract is `packages/core/src/financial-profile.schema.ts`. It has no trading fields. Amounts are whole Kenyan shillings.

## Trust boundaries

```
Browser
  hand-written profile (Amina / Brian) or, later, a parsed profile
  Profile (+ habit plan)    localStorage  pesasense.profile
  Habit reminder            localStorage  pesasense.habit-reminder.v1
  Nostr secret              localStorage  pesasense.nostr-secret.v1
  WalletEvent history       localStorage  pesasense.wallet-events.v1
  Chama circle              localStorage  pesasense.chama.v1
  Breez seed                on this device, via the Breez SDK
  Onboarding draft          sessionStorage only

Next.js server
  BITIKA_API_KEY            quote, collect, status
  BITIKA_WEBHOOK_SECRET     HMAC check on POST /api/onramp/webhook
  purchase map              in memory for this process only
  USSD store                phone link, session, purchase index
                            SQLite file in development (apps/web/.data)
                            in-memory in production unless USSD_STORE_PATH is set

Outside this app
  Bitika                    M-Pesa collect, sats to a Lightning address
  Breez                     Spark wallet the person controls
  bitcoin.co.ke             sats in, KES on M-Pesa out
  Nostr relay               ciphertext (kind 30078) and an anonymous surplus job (kind 5910)
```

The Bitika key never ships to the browser. The browser calls `/api/onramp/quote`, `/api/onramp/purchase`, `/api/onramp/status/:code`, and `/api/onramp/verify-address`. A live key (`bk_live_…`) is refused unless `BITIKA_ALLOW_LIVE=true`.

The webhook verifies `X-Bitika-Signature` in `packages/wallet/src/bitika-webhook.ts`, then stores the purchase in the map in `apps/web/lib/onramp-purchases.ts`. That map is gone when the process restarts. Status polling asks Bitika again when the map has no terminal record. The person's own purchase history is the `WalletEvent` list in `localStorage`, written by `apps/web/lib/wallet-events.ts`.

## What each package does

| Path | Role now |
| --- | --- |
| `apps/web` | PWA. Overview, surplus, habit, learn, invest, wallet, chama, welcome, onboarding, import. |
| `packages/core` | Types, demo profiles, SMS and PDF fixtures, invest allowance. `parseStatement`, `parseSmsBatch`, `buildProfile`, `computeSurplus`, and `runScenario` throw. |
| `packages/wallet` | `BitcoinOnRamp`, Bitika adapter, exchange-rate fallback, phone and Lightning helpers, webhook verification. |
| `packages/ussd` | Handset menu. Calls `investAllowance` and the same Bitika collect. Does not store statements. |
| `packages/nostr` | NIP-44 encrypt-to-self, replaceable kind `30078` event (`d` = `pesasense-profile:v1`), anonymous kind `5910` surplus job, chama ledger rules. |

`packages/core` has no UI imports. Screens read a profile through `apps/web/lib/load-profile.ts`. Demo mode loads `amina.profile.json` or `brian.profile.json`. Parsed mode calls the stubs and surfaces the error. It does not fall back to the hand-written numbers.

## Nostr

`apps/web/components/profile-sync.tsx` runs on the overview screen in demo mode.

Save merges the on-screen profile with this device's `WalletEvent`s, encrypts with NIP-44 to the device key, and publishes via `nostr-tools`. The default relay is `wss://relay.damus.io` (`NEXT_PUBLIC_NOSTR_RELAYS` overrides it). Load decrypts the latest event for that pubkey and writes the stored `WalletEvent`s back into `localStorage`.

Share surplus range uses a new key for that event alone. The tags are the three surplus figures and the horizon in months. The content is empty. No phone, destination, or statement text is attached.

Tests in `packages/nostr/src/profile-store.test.ts` use an in-memory directory. They do not require a relay.

## Chama

`packages/nostr/src/chama-ledger.ts` records who agreed to pay whom. It does not hold keys or a pooled address. The destination on a contribution is copied from the recipient. Callers cannot choose another.

The screen in `apps/web/app/chama/chama-flow.tsx` stores the circle in `localStorage`. Addresses ending `@example.com` are demo addresses: **Record demo contribution** writes a record and sends nothing. Any other address, when it matches this phone's Breez wallet, is paid with `payAndRecord` and then recorded.

A reliability note is opt-in after a finished round. It stays on the circle record. It is not published.

## Stubs

These throw `Not implemented` and have tests that expect the throw (`packages/core/src/stubs.test.ts`):

- `parseStatement` and `parseSmsBatch` in `packages/core/src/parse.ts`
- `buildProfile` and `computeSurplus` in `packages/core/src/profile.ts`
- `runScenario` in `packages/core/src/scenario.ts`

`/import` calls the parsers, catches that error, and routes to `/overview`. The acceptance spec in `packages/core/src/profile.spec.ts` stays skipped until the parser and `buildProfile()` return data.

`/learn` is a short static guide. It does not run scenarios and does not invent a backtest.

eCash is out of scope. There is no pooled wallet and no eCash mint in this repo.

## Libraries this repo does not use

Dexie, Recharts, shadcn/ui, and Postgres are not dependencies. Device state that exists today is `localStorage` and `sessionStorage`, as listed above. The USSD phone link and purchase index use Node's built-in SQLite in development so the handset and the browser share one server record. That file does not hold statements, keys, or a second profile. Production without `USSD_STORE_PATH` keeps it in memory for the process, the same limit as the webhook map.
