# Contributing

The hackathon demo path is the screens in [demo.md](demo.md). Extend the stubs below that path. Do not replace a working screen with a sketch of a later one.

## Where the work still is

1. **Parser** (`packages/core` ingestion). Critical path. SMS shapes are in `packages/core/src/fixtures/sms/`. The PDF and its password are in `statement-fixture.ts`. The demo password is `demo-statement` (`DEMO_STATEMENT_PASSWORD`). Do not invent a national-ID rule. Web and Telegram decrypt the PDF with pdf.js, then call `parseStatement` / `parseSmsBatch`.
2. **Profile engine** (`packages/core` profile and surplus). Critical path. `packages/core/src/profile.spec.ts` is the spec. It is skipped while `buildProfile` throws. When it runs, Amina's and Brian's hand-written profiles are what the SMS should come close to. Do not edit those JSON files to match a wrong result.
3. **Scenarios.** `runScenario` throws. Ship a bundled BTC-KES series and the window math on the client. Do not invent a backtest. The disclaimer constant already lives on the schema.
4. **App shell.** Overview, surplus, habit, learn, invest, wallet, and chama are in the repo. Learn is a short static guide, not a scenario runner. `/?profile=brian` on overview, surplus, habit, and invest is the "not ready yet" case. `PROFILE_SOURCE=parsed` turns demo data off.
5. **Invest and wallet.** Bitika, Breez, device `WalletEvent`s, and the signed webhook receiver are in place. Polling remains the backstop. The webhook record is in memory for one server process.
6. **Nostr and chama.** Save and load encrypt the profile. The anonymous surplus job publishes the range only. The chama reliability note stays on the device. A published badge is not built.

Dexie, Recharts, shadcn/ui, and Postgres are not in this repo. Do not treat them as already chosen. Device state that exists today is described in [architecture.md](architecture.md).

## Working together

- Keep `packages/core` free of UI code.
- Keep the types in `financial-profile.schema.ts` stable. Other packages depend on them.
- Use whole KES integers.
- Use the synthetic fixtures. Never commit real personal data.
- If something is unknown, code against the interface and leave a `TODO` that names the missing piece. A stub must throw, or return data the acceptance spec can check. It must not invent a profile.
- Ask before a large architectural choice this document does not already settle.
- Small commits. Say what changed and why.

## After the hackathon

Not instead of the demo path:

- Finish the parser and `buildProfile()` so `PROFILE_SOURCE=parsed` can replace the invented profiles.
- Historical scenarios on the client, with the disclaimer already in the schema.
- WhatsApp or Telegram for SMS forwarding, only after the on-device profile works.
- A multi-chain advisory layer, still without trading and still without holding funds.

USSD is a second interface over the demo profiles and the on-ramp (`packages/ussd`, [ussd.md](ussd.md)). It does not read on-device statements. Telegram, and spending Bitcoin through other apps, stay out of this demo. Crypto history import remains a stretch.
