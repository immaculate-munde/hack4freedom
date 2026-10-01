# Bitika API (summary for PesaSense)

Public docs: https://bitika.xyz/developers/docs

Base URL: `https://bitikaserver.up.railway.app`

Auth: `Authorization: Bearer bk_…` or `X-API-Key`. Send `Idempotency-Key` (UUID) per payment.

## Collect (Path A)

`POST /api/v1/xwift/collect`

```json
{
  "amount": "100",
  "phone": "254712345678",
  "lightningAddress": "name@blink.sv"
}
```

`lightningAddress` may also be a BOLT11 invoice or LNURL.

Response: `{ "transaction_code": "SBX-…", "status": "processing" }`

## Status

`GET /api/v1/transactions/code/:transactionCode`

States: `processing` → `processing_payment` → `fulfilled`, or `failed`, or `payment_failed`.

## Quote

`GET /api/v1/exchange/rate` (query params: confirm in sandbox). Fallback market rate: `https://trex.bitcoin.co.ke/btcpay/rates` (`BTC.KES`).

## Sandbox

- `bk_test_` keys: no real M-Pesa or sats.
- Phone ending `000001` → `failed`
- Phone ending `000002` → `payment_failed`

## Webhooks

Bitika POSTs signed events to a URL you register in the developer dashboard (that registration uses a developer JWT, not `BITIKA_API_KEY`).

`POST /api/onramp/webhook` checks `X-Bitika-Signature: t=<unix>,v1=<hex>` over `"<timestamp>.<raw body>"` with HMAC-SHA256 and `BITIKA_WEBHOOK_SECRET`. Signatures older than five minutes are rejected. A repeated event id is ignored. The purchase is kept in memory for this server process. `GET /api/onramp/status/:code` returns that record when it is already terminal, and otherwise still asks Bitika.

Events: `transaction.updated`, `payment.completed`, `payment.failed`.

## Keys in this repo

- `BITIKA_API_KEY` in `apps/web/.env.local` (gitignored)
- `BITIKA_WEBHOOK_SECRET` for `POST /api/onramp/webhook`
- Live key only on Vercel with `BITIKA_ALLOW_LIVE=true`
