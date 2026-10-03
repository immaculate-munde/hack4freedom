# Deploy

Deploy the browser demo on Vercel. Deploy one always-on Node process when a real USSD handset has to stay in one session. The server is a proxy for the Bitika key. Screens, the Breez wallet, the Nostr key, the chama circle, and purchase history stay in the visitor's browser.

There is no Dockerfile and no `vercel.json`. Node on the host is **22.13 or newer**, or **24**. The USSD store imports `node:sqlite`, which is stable from Node 22.13. The repo `engines` field says `>=20` for local installs. A production host on 20 will fail when that store opens.

Build with webpack. The Breez WASM setup in `apps/web/next.config.ts` depends on it:

```bash
pnpm --filter @pesasense/web build
```

That script is `next build --webpack`.

## What runs where

| Piece | Where it runs |
| --- | --- |
| Screens, Breez Spark wallet, Nostr key, chama circle, purchase history | The visitor's browser. Breez WASM is bundled for the client only. `next.config.ts` aliases it to `false` on the server. |
| Bitika quote, collect, status, webhook | Next.js route handlers under `apps/web/app/api/onramp/`. The Bitika key never ships to the browser. |
| USSD callback `POST /api/ussd` | The same Node server. Sessions and phone links live in SQLite. |
| Profile ciphertext | A public Nostr relay. The default is `wss://relay.damus.io`. |
| Money | Bitika and the person's own Lightning address. This app holds neither. |

`packages/core`, `packages/wallet`, `packages/ussd`, and `packages/nostr` are TypeScript source that Next compiles. They are not separate services.

## Vercel for the browser demo

This covers `/welcome`, overview, surplus, habit, learn, invest, wallet, and chama. `GET /api/onramp/status/:code` asks Bitika again when the in-memory webhook map is empty, so a serverless restart does not break a buy. The person's history stays in `localStorage`.

Project settings:

- Framework: Next.js
- Root directory: `apps/web`
- Include source files outside that directory, so the workspace packages above `apps/web` are installed
- Install from the repo root with pnpm `10.18.0` (Corepack)
- Build command: `pnpm --filter @pesasense/web build`
- Node.js: 22.x
- Region: Frankfurt (`fra1`) or London (`lhr1`). Vercel has no Africa region. Those two are the closest to Nairobi, Bitika, and an Africa's Talking callback.

Push the repo and import it, or use the Vercel CLI from this folder. Do not commit `apps/web/.env.local`.

### Environment

Set these on the project, then redeploy. `NEXT_PUBLIC_` values are baked in at build time. Changing the Breez key or the relays needs a new build.

| Variable | Hackathon value |
| --- | --- |
| `BITIKA_API_KEY` | Sandbox `bk_test_…`. Server only. |
| `BITIKA_ALLOW_LIVE` | Leave unset. A `bk_live_` key is refused unless this is exactly `true`. |
| `BITIKA_WEBHOOK_SECRET` | Set after you register the webhook. Server only. |
| `NEXT_PUBLIC_BREEZ_API_KEY` | From [Breez](https://breez.technology/request-api-key/). Required for `/wallet`. Public by design. |
| `NEXT_PUBLIC_NOSTR_RELAYS` | Optional. Defaults to `wss://relay.damus.io`. |
| `PROFILE_SOURCE` | Omit it, or `demo`. `parsed` turns the Amina and Brian profiles off, and the parser still throws. |
| `USSD_API_KEY` | Set if the callback might be hit. Production rejects every USSD request without it. |
| `USSD_SERVICE_CODE` | Optional. The example in [ussd.md](ussd.md) is `*384*40401#`. |
| `USSD_STORE_PATH` | Leave unset on Vercel. |

After the first deploy, register:

- Bitika dashboard webhook: `https://pesasense.vercel.app/api/onramp/webhook`
- Africa's Talking callback: `https://pesasense.vercel.app/api/ussd?key=YOUR_USSD_API_KEY`

The callback path is `POST /api/ussd`. Africa's Talking does not send a custom header, so the key has to sit on that URL. It must match `USSD_API_KEY` on Vercel. It is not the Bitika key. Without it, the live callback answers `END Not authorised.` Full menu, routes, and curl steps: [ussd.md](ussd.md).

Sandbox phones ending `000001` and `000002` are the documented failure cases. A normal sandbox phone exercises collect without moving real KES or sats. See [bitika-api.md](bitika-api.md).

### What stays in one process

The filesystem is ephemeral, and instances do not share memory. On Vercel the USSD store is SQLite `:memory:` inside one function instance (`apps/web/lib/ussd-server.ts`). A later menu step can land on another instance and lose the session, the phone link, and the rate-limit counters. The webhook map in `apps/web/lib/onramp-purchases.ts` has the same limit. Invest still works because status polling asks Bitika when that map has no terminal record.

## One Node process for a live USSD session

Africa's Talking posts each menu step to `POST /api/ussd`. Those steps share one session for about 180 seconds. That needs one process.

**Fly.io in Johannesburg (`jnb`)** is the nearest region to Nairobi that can run `next start` as a single machine. **Render in Frankfurt**, scaled to exactly one instance on a plan that does not sleep, is the simpler alternative. Render's free tier spins down after 15 minutes of inactivity. That drops an in-progress USSD session and makes the next request wait on a cold start.

From the repo root, after `pnpm install` and the webpack build above:

```bash
pnpm --filter @pesasense/web start
```

`next start` listens on `0.0.0.0` and `$PORT`. Keep instances at 1. Use the same environment variables as on Vercel, plus:

- `USSD_API_KEY`. Production fails closed without it.
- `USSD_SERVICE_CODE`. The short code the gateway assigned.
- `USSD_STORE_PATH`, only when a disk is attached, for example `/data/ussd.sqlite`. That file holds phone links, sessions, and a purchase index. It must not hold statements or keys. Without a disk, leave this unset. The store stays in memory for that one process, which is enough for a demo that is not restarted mid-session.

Register `https://<host>/api/ussd?key=YOUR_USSD_API_KEY` as the Africa's Talking callback. The current browser demo uses `https://pesasense.vercel.app/api/ussd?key=YOUR_USSD_API_KEY`. The app receives that callback. It does not call the provider's send API. There is no `USSD_USERNAME`.

## Leave these out of the hackathon deploy

Do not add Postgres, Redis, or a second replica. Do not put `BITIKA_API_KEY`, `BITIKA_WEBHOOK_SECRET`, or `USSD_API_KEY` in a `NEXT_PUBLIC_` variable. Leave `BITIKA_ALLOW_LIVE` unset and use a `bk_test_` key. Leave `PROFILE_SOURCE` unset until `buildProfile()` returns data.
