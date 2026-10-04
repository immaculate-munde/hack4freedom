/**
 * Telegram Bot API webhook.
 * Register: POST https://api.telegram.org/bot<token>/setWebhook
 *   with url=https://<host>/api/telegram/webhook
 *   and optional secret_token matching TELEGRAM_WEBHOOK_SECRET.
 *
 * Required env: TELEGRAM_BOT_TOKEN
 * Optional: TELEGRAM_WEBHOOK_SECRET, TELEGRAM_STORE_PATH, TELEGRAM_BOT_USERNAME
 * Purchases also need BITIKA_API_KEY (same as the web invest path).
 */

import { randomUUID } from "node:crypto";
import {
  handleTelegram,
  telegramConfigFromEnv,
  chatIdFromUpdate,
  callbackQueryId,
  inboundFromUpdate,
  type TelegramDeps,
  type TelegramUpdate,
} from "@pesasense/telegram";
import { assertAppInvestAmount } from "../../../../lib/buffer-gate";
import { getBitikaRamp } from "../../../../lib/bitika";
import {
  answerTelegramCallback,
  downloadTelegramFile,
  sendTelegramReplies,
} from "../../../../lib/telegram-api";
import { extractTextFromMpesaPdfBytes } from "../../../../lib/telegram-pdf";
import {
  buildProfileFromSmsText,
  buildProfileFromStatementText,
} from "../../../../lib/telegram-profile";
import { getTelegramStore } from "../../../../lib/telegram-server";
import { rememberPurchase } from "../../../../lib/onramp-purchases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const config = telegramConfigFromEnv(process.env);
  if (!config.botToken) {
    return Response.json(
      {
        error:
          "TELEGRAM_BOT_TOKEN is not set. Add it to apps/web/.env.local and register the webhook.",
      },
      { status: 503 },
    );
  }

  if (config.webhookSecret) {
    const header = req.headers.get("x-telegram-bot-api-secret-token");
    if (header !== config.webhookSecret) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const chatId = chatIdFromUpdate(update);
  const inbound = inboundFromUpdate(update);
  if (chatId === null || !inbound) {
    return Response.json({ ok: true });
  }

  const token = config.botToken;
  const deps: TelegramDeps = {
    now: () => Date.now(),
    store: getTelegramStore(),
    buildFromSms: buildProfileFromSmsText,
    async buildFromPdf(bytes, password, onboarding) {
      const text = await extractTextFromMpesaPdfBytes(bytes, password);
      return buildProfileFromStatementText(text, onboarding);
    },
    downloadFile: (fileId) => downloadTelegramFile(token, fileId),
    bitikaConfigured: () => Boolean(process.env.BITIKA_API_KEY?.trim()),
    newIdempotencyKey: () => randomUUID(),
    async startPurchase(input) {
      assertAppInvestAmount(input.profile, input.amountKes);
      const purchase = await getBitikaRamp().startPurchase({
        amountKes: input.amountKes,
        payerPhone: input.phone,
        destination: input.destination,
        approvedByUser: true,
        idempotencyKey: input.idempotencyKey,
      });
      rememberPurchase(purchase);
      return {
        purchaseId: purchase.purchaseId,
        status: purchase.status,
        amountKes: purchase.amountKes,
        amountSats: purchase.amountSats,
      };
    },
  };

  try {
    const result = await handleTelegram(
      chatId,
      inbound,
      deps,
      config,
      callbackQueryId(update),
    );
    if (result.callbackQueryId) {
      await answerTelegramCallback(token, result.callbackQueryId);
    }
    await sendTelegramReplies(token, chatId, result.replies);
  } catch (error) {
    console.error(
      JSON.stringify({
        source: "telegram",
        event: "handle-failed",
        message: error instanceof Error ? error.message : "error",
      }),
    );
    try {
      await sendTelegramReplies(token, chatId, [
        {
          text: "Something went wrong on our side. Send /start to try again.",
        },
      ]);
    } catch {
      // ignore secondary send failures
    }
  }

  return Response.json({ ok: true });
}

/** Health / setup hint when opening the route in a browser. */
export async function GET() {
  const config = telegramConfigFromEnv(process.env);
  return Response.json({
    ok: true,
    configured: Boolean(config.botToken),
    hint: config.botToken
      ? "POST Telegram updates to this URL."
      : "Set TELEGRAM_BOT_TOKEN in apps/web/.env.local, then setWebhook to this path.",
  });
}
