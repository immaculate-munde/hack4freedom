# Demo script

For judges and anyone else walking the live path. Each row is one action, what it proves, and what to say if it breaks.

Start the app with the steps in the README. Copy `apps/web/.env.example` to `apps/web/.env.local` and set `BITIKA_API_KEY` (sandbox `bk_test_…`) and `NEXT_PUBLIC_BREEZ_API_KEY` before the wallet and invest beats.

A first visit in a fresh browser opens `/welcome`, because `hasSeenWelcome` is not set yet. Tap **Get started**. That stores the flag and opens `/onboarding`. You can leave the questions and open `/overview` directly. The questions are a draft in `sessionStorage`. They are not the financial profile.

## Clicks

| Action | What it proves | If it breaks |
| --- | --- | --- |
| Open `/welcome` and tap **Get started** | The first screen states three promises: data stays on the phone, the app never holds the money, and there is no trading pressure. | Open `/overview` after the flag is set. A blank linen screen means the redirect has not finished. |
| Open `/import` (or `/onboard`), upload `amina-statement.pdf`, password `demo-statement` | PDF decrypts in the browser, `parseStatement` builds a profile from the fixture rows. The password is not saved. | Wrong password: clear error, try again. Demo fixture password is always `demo-statement` (see `DEMO_STATEMENT_PASSWORD`). SMS paste also works without a password. |
| Open `/overview` | Amina (invented). **Demo data** badge. Safe monthly surplus **KES 2,000 – KES 15,500**. Typical KES 11,500. Habit **KES 1,500 / month**. The numbers come from `packages/core/src/fixtures/profiles/amina.profile.json`. | If the page says no profile, `PROFILE_SOURCE=parsed` is on. Unset it, or set `PROFILE_SOURCE=demo`, and restart `pnpm dev`. |
| Open `/overview?profile=brian` | Brian (invented). Copy says the buffer comes first. Surplus floor is KES 0. | The query is ignored in parsed mode. Use demo mode. |
| Open `/invest?profile=brian` | The buy screen refuses. Title: **Not ready yet.** | If a buy form appears, the URL lost `?profile=brian`. |
| Open `/surplus` | Commitments and spending rows from the same profile. The range is the profile's surplus, not a figure typed into the layout. | Same parsed-mode fallback as overview. |
| Open `/habit` | **Save habit** writes `investmentPlan` into `localStorage` key `pesasense.profile` (real persistence, not a mock). Cadence is monthly. Nothing is sent from this screen. | Brian's habit explains the buffer. It does not offer a buy. |
| **Remind me on the 1st** | Preference in `pesasense.habit-reminder.v1`. Requests Notification permission, arms `setTimeout` when the next 1st is within ~24 days, and shows an in-app banner on/after the 1st. No SMS. | Browsers cannot guarantee a month-ahead alert without a service worker/push. Deny permission and still show the banner path. |
| Open `/sensi` | Thin voice vertical: confirm Sensi picture → Qwen summary from profile facts → optional ElevenLabs TTS. | Missing `QWEN_API_KEY`/`DASHSCOPE_API_KEY` or `ELEVENLABS_API_KEY`: API returns a clear key-missing error. |
| Open `/learn` | Three short guides (what Bitcoin is, why 3 to 5 years, how self-custody works) and scam red flags. | This screen does not call `runScenario`. Historical low / median / high is still a stub. |
| On `/overview`, **Save encrypted copy** | NIP-44 encrypt-to-self, published as a kind `30078` event with `d` tag `pesasense-profile:v1`. The secret is `pesasense.nostr-secret.v1` in `localStorage`. Success text starts with `Encrypted copy saved`. | Relay unreachable: say the key never left the browser, and the default relay is `wss://relay.damus.io`. Set `NEXT_PUBLIC_NOSTR_RELAYS` if you have another. |
| **Load encrypted copy** | Decrypts that event and restores device `WalletEvent`s for this profile id. | `No encrypted profile is stored yet` means save has not succeeded on this key. |
| **Share surplus range** | A fresh key publishes kind `5910` with floor, typical, ceiling, and horizon only. The success text says no phone number or wallet address was included. | Same relay fallback as save. |
| Open `/wallet` and create a wallet | Breez SDK Spark (WASM) in the browser. Show the recovery phrase, then the backup step. The phrase is not sent to PesaSense. | Create fails until `NEXT_PUBLIC_BREEZ_API_KEY` is set. Restore with the 12 words if create already succeeded in this browser. |
| Open `/invest` (demo Amina) | No habit save required. Lands on **amount** with a demo M-Pesa number; **Review** opens the Bitika approve sheet; sandbox simulates to **Filled**. | Missing key: the page says to set `BITIKA_API_KEY`. Sandbox does not prompt a real phone and may not fund the Breez balance. Say that before anyone checks the wallet. |
| Open `/wallet` → **Preview withdraw steps** | Walkthrough of `07…@bitcoin.co.ke` via bitcoin.co.ke (QR + copy). Real withdraw after a filled buy uses the same rail from Invest. | Demo card does not move real sats. |
| On `/overview`, link a phone under **Use this on a handset**, then run the curl steps in [ussd.md](ussd.md) | The same surplus numbers and the same Bitika collect. A USSD buy shows in **Use this on a handset**. A web buy shows on USSD option 4. | The live Africa's Talking callback is `https://pesasense.vercel.app/api/ussd?key=YOUR_USSD_API_KEY`. Until `USSD_SERVICE_CODE` is set, the page shows the example code `*384*40401#`. Local posts to `/api/ussd` do not need a phone. |
| Phone ending `000001` | Bitika status `failed`. | Use it on purpose when you want the failure path. |
| Phone ending `000002` | Bitika status `payment_failed`. | Same. Any other sandbox phone simulates a payment. |
| Wait on the invest status | The browser polls `GET /api/onramp/status/:code`. A signed webhook can fill the same record sooner. The record lives in memory for this server process. | If the webhook never arrives, polling is the path that still works. Restarting the server drops the in-memory record. The device `WalletEvent` in `localStorage` remains. |
| **Withdraw to M-Pesa (in app)** on Invest, after a funded wallet | Breez sends sats to `07…@bitcoin.co.ke`. KES on M-Pesa is bitcoin.co.ke's rail. | Sandbox buys often leave the wallet unfunded. Skip withdraw and describe this sentence. Do not invent a balance. |
| Open `/chama` | Chama Sisters, invented, in `localStorage` under `pesasense.chama.v1`. This phone is Amina. Addresses ending `@example.com` are demo addresses. | **Reset demo circle** restores the invented members. |
| **Record demo contribution** | Records that this member says they paid the current recipient. The button says no sats were sent. One member cannot record or redirect another's payment. | If the button is missing, this phone's address is not an `@example.com` address, or this member is the recipient this round. |
| Replace Amina's address with a real Lightning address, **Use my Breez address**, then **Pay … sats from my wallet** | `payAndRecord` sends from the Breez wallet that matches this member, then records the settlement. The ledger still holds no balance. | Quote failure: the invest quote route needs the Bitika key. Wallet locked: unlock it on `/wallet` first. A demo address never takes this button. |
| After a finished round, **Keep a note for this phone** | Opt-in reliability note stored on the circle record. It is not a published NIP-58 badge. The button stays disabled until a round has finished. | Say the note is local. Do not call it a public credential. |

## What to leave unsaid

- Do not invent a different demo password. The fixture opens with `demo-statement` only.
- Do not say the sandbox funded a wallet unless the balance on `/wallet` changed.
- Do not call Bitika or bitcoin.co.ke licensed. See [regulation.md](regulation.md).
- Do not describe eCash. This demo does not use it.
