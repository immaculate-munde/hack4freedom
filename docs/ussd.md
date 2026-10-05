# USSD

USSD is another way into the same PesaSense rules. A handset does not get a second profile or a second on-ramp.

```
Handset → Africa's Talking → POST /api/ussd → investAllowance + Bitika
Browser → /overview and /invest → the same functions → the same purchase index
```

Statements stay on the phone. USSD reads the demo profile the browser is using (Amina or Brian) after that M-Pesa number is linked. Buys still need an explicit yes. Sats go to a Lightning address the person set. PesaSense does not hold them.

## Menu

Unlinked number:

```
1 Link with code
2 Demo Amina
3 Demo Brian
9 Language
0 Exit
```

Linked number:

```
1 Surplus
2 Habit
3 Buy Bitcoin
4 Buy status
5 Learn
6 Chama
9 Language
0 Exit
```

Learn uses the same topics as the web Learn page and Telegram. Buy asks for a whole-shilling amount, shows the Lightning address, then `1` to confirm or `2` to cancel. Brian's profile is refused with the same buffer rule as `/invest?profile=brian`. Turning `BUFFER_GATE` or `NEXT_PUBLIC_BUFFER_GATE` off relaxes that block here the same way it does on Invest. Amina cannot buy above her surplus floor (KES 2,000) while the gate is on.

The gateway sends the whole chain each time (`3*1500*1`). A repeated `sessionId` and `text` returns the same screen and does not collect twice. The Bitika idempotency key is a UUID derived from the session and the amount.

## Link a number

On `/overview` or `/invest`, **Use this on a handset**:

1. Enter the M-Pesa number that will dial.
2. Enter a real Lightning address (`name@wallet.com`). Addresses ending `.invalid` are refused. Invoices are refused on USSD because they do not fit on a screen. The web invest form can still pay an invoice.
3. **Link this number**, or **Get a 6-digit code** and enter it on the handset under **Link with code**. The code lasts 15 minutes and works once.

A buy started in the browser is stored on that phone number. USSD option **4** reads it. A buy started on USSD shows in the same card. The device purchase list on the invest screen is still this browser's `localStorage`. The USSD card is the shared list.

## Callback

`POST /api/ussd`

Africa's Talking sends `application/x-www-form-urlencoded`:

| Field         | Meaning                                                          |
| ------------- | ---------------------------------------------------------------- |
| `sessionId`   | Provider session. Bound to the phone number on the first screen. |
| `serviceCode` | Must match `USSD_SERVICE_CODE` when that variable is set.        |
| `phoneNumber` | MSISDN. Normalised to `2547…`.                                   |
| `text`        | Empty on the first screen, then `1*1500*1`.                      |

The response is `text/plain`: `CON …` to keep the session, `END …` to finish it. JSON with the same field names is accepted so you can test with curl. `msisdn` is accepted as an alias for the phone number.

### Africa's Talking callback URL

The browser demo is [https://pesasense.vercel.app](https://pesasense.vercel.app). In the Africa's Talking dashboard, paste:

```
https://pesasense.vercel.app/api/ussd
```

Africa's Talking posts the four form fields above. It does not send a custom header. Production rejects every callback until `USSD_API_KEY` is set on the host and the request carries that same value. Put it on the callback URL, because that is the field the dashboard gives you:

```
https://pesasense.vercel.app/api/ussd?key=YOUR_USSD_API_KEY
```

Use the Vercel `USSD_API_KEY`. Do not use the Bitika key. Curl and other clients can send the same secret as `X-USSD-Key` or `Authorization: Bearer …` instead of `?key=`. Local `pnpm dev` allows a missing key. A request with no key on the live host returns `END Not authorised.`

`GET /api/ussd/config` returns the provider, the callback path, and whether `USSD_SERVICE_CODE` is set. It does not return the key. While that variable is unset, the config shows the example code `*384*40401#` and the callback accepts any service code.

| Route | Who calls it |
| --- | --- |
| `POST /api/ussd` | Africa's Talking, once per menu step. |
| `GET /api/ussd/config` | The overview card, to show the short code. |
| `POST /api/ussd/link` | The browser, to attach an M-Pesa number to Amina or Brian and a Lightning address. |
| `POST /api/ussd/link-code` | The browser, for a 6-digit code that lasts 15 minutes and works once. |
| `GET /api/ussd/activity?phone=` | The browser, for the masked number and the shared purchase list. |

Link, link-code, and activity reject `Sec-Fetch-Site: cross-site`. They do not use `USSD_API_KEY`.

## Local test without a phone

Start the app (`pnpm dev`). In another shell, from the repo root:

```bash
curl -s -X POST http://localhost:3000/api/ussd \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"session-0001\",\"serviceCode\":\"*384*40401#\",\"phoneNumber\":\"254712345678\",\"text\":\"\"}"
```

If `USSD_API_KEY` or `USSD_SERVICE_CODE` is set, send the key and the same code. Then:

```bash
curl -s -X POST http://localhost:3000/api/ussd \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"session-0001\",\"serviceCode\":\"*384*40401#\",\"phoneNumber\":\"254712345678\",\"text\":\"2\"}"
```

`2` links the invented Amina profile. `2*1` is her surplus. To buy, link `amina@blink.sv` (or another real address) from the overview card first, then on a new session send `3`, `3*1500`, and `3*1500*1`. A sandbox `BITIKA_API_KEY` is required for that last step. The buy then appears on the overview card for that phone.

Form body, which is what Africa's Talking sends:

```bash
curl -s -X POST http://localhost:3000/api/ussd \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "sessionId=session-0002" \
  --data-urlencode "serviceCode=*384*40401#" \
  --data-urlencode "phoneNumber=254712345678" \
  --data-urlencode "text="
```

A public tunnel is only needed when a real gateway must reach your laptop. The app does not start one. Use whatever HTTPS tunnel you already use for the Bitika webhook, and register that URL plus `/api/ussd`.

## Store

Development writes `apps/web/.data/ussd.sqlite` (gitignored). The schema is migration `001_init`:

| Table               | What it is                                    |
| ------------------- | --------------------------------------------- |
| `ussd_accounts`     | Phone → demo profile id and Lightning address |
| `ussd_sessions`     | `sessionId`, last text, last response, expiry |
| `ussd_link_codes`   | Six-digit codes                               |
| `purchase_index`    | Web and USSD buys, indexed by phone and time  |
| `rate_buckets`      | Request and buy limits                        |
| `schema_migrations` | Applied migration ids                         |

Indexes: `idx_ussd_sessions_phone`, `idx_ussd_sessions_expires`, `idx_ussd_link_codes_expires`, `idx_purchase_phone_created`.

This is not a second financial profile. Postgres is still not a dependency. Node's built-in SQLite is used so local web and USSD stay in step across a restart. On a host with no durable disk, leave `USSD_STORE_PATH` unset. The store stays in memory for that process, which is the same limit as the Bitika webhook map.

## Environment

| Variable                       | Role                                                                                                       |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `USSD_PROVIDER`                | Label for logs. Default `africastalking`. The callback fields are the ones above.                          |
| `USSD_SERVICE_CODE`            | Expected short code, for example `*384*40401#`. Unset accepts any code, and the screen shows that example. |
| `USSD_API_KEY`                 | Shared secret for the callback. Required in production. Africa's Talking sends it as `?key=` on the callback URL. |
| `USSD_SESSION_TTL_SECONDS`     | Default 180.                                                                                               |
| `USSD_STORE_PATH`              | SQLite file. Unset uses `.data/ussd.sqlite` in development and memory in production.                       |
| `USSD_MAX_REQUESTS_PER_MINUTE` | Default 20 per phone.                                                                                      |
| `USSD_MAX_BUYS_PER_HOUR`       | Default 3 per phone.                                                                                       |

There is no `USSD_USERNAME`. This app receives the callback. It does not call the provider's send API.

## Security

- The callback is public. Production fails closed without `USSD_API_KEY`.
- The phone number is taken from the gateway, not typed in the menu.
- A `sessionId` is refused if a later request arrives from a different number.
- Menu text must be digits and `*`.
- Buy requires `1` on the confirm screen (`approvedByUser: true`).
- Amounts go through `assertInvestAmount`.
- Lightning addresses only. `.invalid` demo addresses are refused.
- Link and activity routes reject `Sec-Fetch-Site: cross-site`.
- Logs use a masked phone and do not include the menu text, so a link code is not written to the log.
- Handset errors do not include Bitika bodies, stack traces, or the raw phone number.

The link route has no login, same as the rest of this demo. The confirm screen is the approval step, and it prints the destination before anything is sent.

## Production

A live handset needs one always-on Node process. Vercel is the host for the browser demo. Its instances do not share the in-memory store, so a later menu step can lose the session. Host choice, region, and env vars: [deploy.md](deploy.md).

- Set `USSD_API_KEY` and `USSD_SERVICE_CODE` on the host. The live browser demo is [https://pesasense.vercel.app](https://pesasense.vercel.app).
- In the Africa's Talking dashboard, paste `https://pesasense.vercel.app/api/ussd?key=YOUR_USSD_API_KEY`. The query value is the Vercel `USSD_API_KEY`, not the Bitika key. Another host uses the same path: `https://<host>/api/ussd?key=YOUR_USSD_API_KEY`.
- One Node process can use the default in-memory store. More than one instance needs a shared `USSD_STORE_PATH` on a disk that survives deploys. Vercel's filesystem does not. Do not put statements in that file.
- Sessions last three minutes. Expired or unknown sessions tell the person to dial again.
- `pnpm test` covers the menu, linking, buys, duplicates, expiry, rate limits, and the SQLite migration.
