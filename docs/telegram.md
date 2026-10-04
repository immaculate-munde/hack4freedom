# Telegram bot

Telegram is another way into the same PesaSense loop: optional questions, import/parse, financial reading, save a habit, remind on the 1st, and review/approve a purchase. It is not a pixel clone of every web screen.

**Honest privacy:** when someone uploads a statement or pastes SMS to the bot, that content leaves their phone and is processed by the server. The web import path still reads statements on the device. Do not claim "never leaves your phone" for the Telegram path.

```
Telegram → POST /api/telegram/webhook → parseSmsBatch / parseStatement + buildProfile
         → habit + reminder (session store)
         → Approve → Bitika collect (approvedByUser: true)
```

## Conversation

1. `/start` — what PesaSense does + upload honesty + approve-every-purchase
2. Optional questions (debt / chama / goal) — skip allowed
3. Import — SMS paste or PDF (password asked only when needed; demo fixture password `demo-statement`)
4. Summary — income range, commitments, surplus floor/typical/ceiling, habit %, resilience
5. Set habit — whole KES, capped at surplus floor; monthly default, weekly optional
6. Remind me on the 1st — stores preference; does not purchase
7. Review investment — risk line, phone, Lightning destination, explicit **Approve** only then calls Bitika

Never auto-send M-Pesa or Bitcoin. If `BITIKA_API_KEY` is missing, the bot says so and stops (same as web).

## Env

Copy into `apps/web/.env.local` (never commit real tokens):

| Variable | Purpose |
| --- | --- |
| `TELEGRAM_BOT_TOKEN` | BotFather token. Required for live replies. |
| `TELEGRAM_WEBHOOK_SECRET` | Optional. Same value as `secret_token` in `setWebhook`. |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | Bot username without `@`. Enables the welcome CTA. |
| `TELEGRAM_STORE_PATH` | Optional JSON session file. Dev default: `.data/telegram-sessions.json`. Use `:memory:` to force memory. |
| `BITIKA_API_KEY` | Same sandbox/live key as web invest. |

## Register the webhook

With a public HTTPS host (or a tunnel to local `pnpm dev`):

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://<host>/api/telegram/webhook\",\"secret_token\":\"$TELEGRAM_WEBHOOK_SECRET\"}"
```

`GET /api/telegram/webhook` returns whether the token is configured. Without `TELEGRAM_BOT_TOKEN`, `POST` returns 503 — the code and unit tests still ship.

## What stays web-only

Intentionally not cloned in Telegram for this hackathon path:

- Learn chart / long education screens
- Breez wallet create/restore
- Nostr encrypted backup
- Chama round UI
- Full onboarding questionnaire depth

## Tests

Pure state-machine coverage lives in `packages/telegram/src/*.test.ts` (no real Telegram network).
