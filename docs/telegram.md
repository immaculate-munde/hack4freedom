# Telegram bot

Telegram is another way into the same PesaSense loop: optional questions, import/parse, financial reading, save a habit, remind on the 1st, and make your first transaction (approve to buy). It is not a pixel clone of every web screen.

**Honest privacy:** when someone uploads a statement or pastes SMS to the bot, that content leaves their phone and is processed by the server. The web import path still reads statements on the device. Do not claim "never leaves your phone" for the Telegram path.

```
Telegram → POST /api/telegram/webhook → parseSmsBatch / parseStatement + buildProfile
         → habit + reminder (session store)
         → Approve → Bitika collect (approvedByUser: true)
```

## Conversation

Primary choices use **reply keyboards** (not inline callbacks). Tapping a choice sends that label as a normal user message, so it appears as the user's bubble in chat history. The bot then replies with the next question — no "You chose: …" echo.

1. `/start` — what PesaSense does + upload honesty + approve-every-purchase, then a short path menu:
   - **Start a small habit** — investment path (below)
   - **Learn about Bitcoin** — education in Telegram only (no statement, no purchase)
2. Habit path: optional questions (debt / chama / goal) — skip allowed
3. Import — SMS paste or PDF (password asked only when needed; demo fixture password `demo-statement`)
4. Summary — **Sensi LLM overview** (same OpenRouter/Qwen keys as the web app) plus the structured surplus numbers; if no LLM key, deterministic summary only. On the ready step, free-text questions also go to Sensi chat.
5. Set habit — whole KES, capped by money left after bills; then Monthly (default) or Weekly on the reply keyboard
6. Remind me on the 1st — stores preference; does not purchase
7. Make your first transaction today — risk line, phone, Lightning destination, explicit **Approve** only then calls Bitika

**Learn path** (stays in chat): short pages on what a small habit is (a small amount you plan to put in Bitcoin), Lightning to your own wallet, reminders vs auto-send, approve-each-purchase, Bitcoin can lose value, education not advice, money left after bills at a high level. Ends with **Start a small habit** or **Ask something else** (back to menu). `/start` always resets to the menu. `/help` lists both paths.

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
| `OPENROUTER_API_KEY` (or Qwen/DashScope) | Same Sensi coach as web Overview / `/sensi`. Optional — bot falls back to rule-based summary. |

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
