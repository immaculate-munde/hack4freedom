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

## Keys in this repo

- `BITIKA_API_KEY` in `apps/web/.env.local` (gitignored)
- Live key only on Vercel with `BITIKA_ALLOW_LIVE=true`
