/**
 * Telegram bot env. Tokens stay in the server process — never in the client bundle.
 */

export type TelegramConfig = {
  botToken: string | null;
  /** Optional shared secret checked against X-Telegram-Bot-Api-Secret-Token. */
  webhookSecret: string | null;
  sessionTtlMs: number;
  botUsername: string | null;
};

export function telegramConfigFromEnv(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
): TelegramConfig {
  const ttlRaw = env.TELEGRAM_SESSION_TTL_SECONDS?.trim();
  const ttlSeconds = ttlRaw ? Number(ttlRaw) : 86_400;
  return {
    botToken: env.TELEGRAM_BOT_TOKEN?.trim() || null,
    webhookSecret: env.TELEGRAM_WEBHOOK_SECRET?.trim() || null,
    sessionTtlMs:
      Number.isFinite(ttlSeconds) && ttlSeconds > 0
        ? Math.round(ttlSeconds * 1_000)
        : 86_400_000,
    botUsername:
      env.TELEGRAM_BOT_USERNAME?.trim()?.replace(/^@/, "") ||
      env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim()?.replace(/^@/, "") ||
      null,
  };
}
