# PesaSense

A private, on-device financial profile that helps someone in Kenya start a small Bitcoin habit, without trading and without the app holding their money.

Built for [Hack4Freedom](https://www.hack4freedom.com/) Nairobi.

Live site at [Pesasense](https://pesasense.vercel.app/)

## For judges

The live path is a surplus, a refused plan when the buffer is thin, a non-custodial buy, a browser wallet, an encrypted Nostr copy, and a chama record that never holds sats.

A first visit opens [http://localhost:3000/welcome](http://localhost:3000/welcome). Tap **Get started**. That sets a flag in this browser. You can then open the screens below. `/` redirects to `/overview`. Step-by-step clicks and fallbacks: [docs/demo.md](docs/demo.md).

| Open | What you should see |
| --- | --- |
| [/overview](http://localhost:3000/overview) | Amina's surplus. Floor **KES 2,000**, typical KES 11,500, ceiling KES 15,500. A **Demo data** badge. Those numbers are a hand-written profile, not a parsed statement. **Private copy** can save and load that profile on Nostr. |
| [/overview?profile=brian](http://localhost:3000/overview?profile=brian) | A thin history. The app says the buffer comes first. |
| [/invest?profile=brian](http://localhost:3000/invest?profile=brian) | **Not ready yet.** Bitcoin comes after the emergency cushion. |
| [/surplus](http://localhost:3000/surplus) | Income, commitments, and spending that add up to that range. |
| [/habit](http://localhost:3000/habit) | Amina's draft plan of **KES 1,500** a month, under the floor. The app reminds. It does not move money by itself. |
| [/learn](http://localhost:3000/learn) | Short notes on Bitcoin, a 3 to 5 year horizon, self-custody, and scam flags. |
| [/wallet](http://localhost:3000/wallet) | Create or restore a Breez Spark wallet in the browser. The recovery phrase stays on the device. |
| [/invest](http://localhost:3000/invest) | A buy capped by the surplus floor. Bitika collects on M-Pesa and sends sats to a Lightning address the person controls. |
| [/chama](http://localhost:3000/chama) | Invented Chama Sisters. A demo address records a payment and sends nothing. A real address is paid from that member's Breez wallet. |

**Running in this repo:** the screens above, Bitika collect with an explicit yes, device purchase history, a signed webhook kept in memory for this server process, NIP-44 encrypt-to-self with a NIP-78 event and one anonymous NIP-90 surplus job, and the chama rules.

**Specified, not running:** SMS and PDF parsing, `buildProfile()`, and historical scenarios. Those functions throw `Not implemented`. `PROFILE_SOURCE=parsed` shows that no profile has been built. The reliability note stays on the device. eCash is out of scope. The acceptance test in `packages/core/src/profile.spec.ts` is skipped until the parser and `buildProfile()` return data.

## Freedom tech in this build

Bitcoin and Lightning are the payment path. Bitika collects KES on M-Pesa and pays a Lightning address. Breez Spark holds the wallet in the browser. Withdraw sends sats to `07…@bitcoin.co.ke`, and bitcoin.co.ke pays KES on M-Pesa.

Nostr stores the encrypted profile. The key stays in this browser. The anonymous surplus job publishes the floor, typical, and ceiling only. Nostr does not hold sats.

eCash is out of scope. The chama never pools money. Each member pays the person whose turn it is, from a wallet that member controls. Recording a demo address does not send a payment.

## The problem

Two gaps came up in interviews and in a small survey called "Your Money, Your Choices" (11 responses, self-selected, so treat it as direction, not proof).

People are curious about investing, including Bitcoin, but do not know where to start, how much they need, or whether it is safe. Many assume they need a large amount of capital.

Trust is the harder gap. Past scams, unclear regulation, and volatility make people reasonably cautious. An app that asks for money before it earns trust will fail.

M-Pesa already holds the financial life of millions of people, but that history sits unused. Most of the people we heard from already save, mainly in M-Shwari, Ziidi, banks, money market funds, and SACCOs. Those products are the real alternative.

The financial profile is the product. It is one structured object, meant to be built on the person's own device from about six months of history. It describes. It does not score or label anyone. For the hackathon, the home screen reads two invented profiles that match the contract: Amina (a surplus she can use) and Brian (a history that is not ready). The contract is `packages/core/src/financial-profile.schema.ts`. It has no trading fields.

## How the money moves

PesaSense is not in the payment path.

```
M-Pesa  →  Bitika  →  Lightning address the person controls
                         (pasted, or a Breez wallet in this browser)

Withdraw: Breez wallet  →  07…@bitcoin.co.ke  →  KES on M-Pesa
```

Bitika is the on-ramp. bitcoin.co.ke is the off-ramp. The chama screen never holds a balance. A live Bitika key is refused unless `BITIKA_ALLOW_LIVE=true`. Local development uses a `bk_test_` sandbox key. Sandbox phones ending `000001` and `000002` are the documented failure cases. Details: [docs/bitika-api.md](docs/bitika-api.md).

## Principles

- **Non-custodial.** PesaSense never holds funds or private keys. The person holds their keys.
- **Accumulate, do not trade.** Scheduled small buys only. No price alerts, candlestick charts, sell prompts, order books, or leverage.
- **Manual approval.** Every purchase needs an explicit yes.
- **Privacy by design.** Raw statements and transactions stay on the device. The platform stores no raw file and no password. A profile is encrypted before it is published to Nostr.
- **Explicit, user-initiated access only.** No background scraping of SMS. Kenya's Data Protection Act 2019 applies.
- **No model sees raw transactions.** Categories start from deterministic rules. If a model is ever used, it may see merchant name strings only, never amounts or identifiers.
- **Education, not advice.** The wording is "here is how Bitcoin has behaved historically", not "here is what we project for you".
- **Ranges, never a single prediction.** Scenarios, once built, show low, median, and high.
- **Honest about fit.** If the buffer is thin, the app says Bitcoin is not the right next step. Brian's profile is that case.
- **No commission on purchases.** The working revenue assumption is freemium plus a subscription.

## Architecture

TypeScript end to end. Sensitive data stays on the device. The server is a thin proxy for the on-ramp so the Bitika key never ships to the browser. A longer map of trust boundaries is in [docs/architecture.md](docs/architecture.md).

| Layer | Choice |
| --- | --- |
| Repo | pnpm workspaces |
| Web app | Next.js App Router, PWA, Tailwind. `next dev --webpack` because Breez ships WASM. |
| Parser and profile | `packages/core`. Vitest. No UI imports. Parser and `buildProfile()` still throw. |
| On-ramp | `BitcoinOnRamp` in `packages/wallet`, with a Bitika adapter. Next.js routes under `apps/web/app/api/onramp/`. |
| USSD | `packages/ussd`. Africa's Talking posts to `https://pesasense.vercel.app/api/ussd`. Same surplus rules and the same Bitika collect. See [docs/ussd.md](docs/ussd.md). |
| In-app wallet | Breez SDK Spark in the browser. |
| Profile encryption | `packages/nostr` with `nostr-tools`. NIP-44, kind `30078`, one anonymous kind `5910` job. |
| Chama | `packages/nostr/src/chama-ledger.ts`. Rules are tested. The screen persists the demo circle in `localStorage`. |
| Hosting | Vercel for the browser demo. One always-on Node process when USSD must keep a session. See [docs/deploy.md](docs/deploy.md). |

```
apps/web/          PWA: overview, surplus, habit, learn, invest, wallet, chama
packages/core/     profile contract, parser stubs, demo profiles, fixtures
packages/wallet/   on-ramp interface, Bitika, webhook verify, phone and Lightning helpers
packages/ussd/     handset menu, sessions, phone links, shared purchase index
packages/nostr/    encrypted profile store, chama ledger
```

Money is whole Kenyan shillings.

## Getting started

You need Node.js 20 or newer. This repo pins pnpm through Corepack.

```bash
corepack enable
corepack prepare pnpm@10.18.0 --activate
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

**Invest, wallet, and Nostr:** copy `apps/web/.env.example` to `apps/web/.env.local` and set:

- `BITIKA_API_KEY` — sandbox `bk_test_…` (see [docs/bitika-api.md](docs/bitika-api.md))
- `NEXT_PUBLIC_BREEZ_API_KEY` — from [Breez](https://breez.technology/request-api-key/)
- `BITIKA_WEBHOOK_SECRET` — only if you register `https://<your-host>/api/onramp/webhook` in the Bitika dashboard
- `NEXT_PUBLIC_NOSTR_RELAYS` — optional. Defaults to `wss://relay.damus.io`

Without those keys the surplus, learn, habit, and chama screens still load. Invest shows that the Bitika key is missing. Wallet create fails until the Breez key is set. Save and load need a relay the browser can reach.

USSD is the same app on a handset. The live callback to paste in Africa's Talking is `https://pesasense.vercel.app/api/ussd?key=YOUR_USSD_API_KEY` (`YOUR_USSD_API_KEY` is the Vercel `USSD_API_KEY`, not the Bitika key). Link a number on `/overview`, or post sample menus to `POST /api/ussd` locally. Steps: [docs/ussd.md](docs/ussd.md).

Set `PROFILE_SOURCE=parsed` to turn the demo profiles off. That path calls the parser and does not fall back to the hand-written numbers.

```bash
pnpm test
pnpm typecheck
pnpm lint
```

`pnpm test` runs Vitest across the packages. Covered today: the profile contract and fixtures, profile-source switching, invest allowance, wallet-event status, Bitika status mapping, webhook signature checks, phone and Lightning-address helpers, encrypted profile storage, the anonymous surplus job, the chama rules, and the USSD menu, sessions, and purchase index. The profile acceptance spec stays skipped while `buildProfile` throws.

The SMS fixtures follow published M-Pesa receipt shapes, including reversals, a failed send, Fuliza, and a withdrawal whose date comes before the word "Withdraw". The encrypted statement is `packages/core/src/fixtures/statements/amina-statement.pdf`. Its demo password is `demo-statement`, not a national ID.

All fixtures are synthetic. Do not replace them with a real M-Pesa statement.

## After the hackathon

Finish the parser and `buildProfile()` so `PROFILE_SOURCE=parsed` can replace the invented profiles. Where to extend the stubs: [docs/contributing.md](docs/contributing.md).

## Regulation and privacy

PesaSense is advisory and non-custodial. Partner licence claims are marked **to verify** in [docs/regulation.md](docs/regulation.md). Raw statement text is device-only. Kenya's Data Protection Act 2019 applies.

## Docs

| Doc | Who it is for |
| --- | --- |
| [docs/demo.md](docs/demo.md) | Judges and anyone demoing. Clicks, what each click proves, and a fallback. |
| [docs/deploy.md](docs/deploy.md) | Where to host the browser demo and a live USSD callback, and which env vars to set. |
| [docs/architecture.md](docs/architecture.md) | How data and money are separated, and where the stubs are. |
| [docs/bitika-api.md](docs/bitika-api.md) | The on-ramp calls this app actually makes. |
| [docs/ussd.md](docs/ussd.md) | Handset menu, the Africa's Talking callback URL, and local curl steps. |
| [docs/contributing.md](docs/contributing.md) | Where to extend the stubs without breaking the contract. |
| [docs/regulation.md](docs/regulation.md) | Licence notes that are still marked to verify. |

## Disclaimer

PesaSense provides education, not financial advice. Bitcoin can lose value. Past performance does not indicate future results.
