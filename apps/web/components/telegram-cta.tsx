/**
 * Entry to the Telegram bot. Uses NEXT_PUBLIC_TELEGRAM_BOT_USERNAME when set,
 * otherwise the live bot @yoursensi_bot.
 */

const DEFAULT_BOT_USERNAME = "yoursensi_bot";

function botUsername(): string {
  const fromEnv =
    typeof process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME === "string"
      ? process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME.trim().replace(/^@/, "")
      : "";
  return fromEnv || DEFAULT_BOT_USERNAME;
}

export function telegramBotUrl(): string {
  return `https://t.me/${botUsername()}`;
}

export function TelegramCta({
  className,
  label = "Chat with Sensi on Telegram",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <a
      href={telegramBotUrl()}
      target="_blank"
      rel="noreferrer"
      className={className ?? "btn btn-secondary rounded-full px-6"}
    >
      {label}
    </a>
  );
}

/** Always true with the live-bot fallback; kept for call sites that gate the CTA. */
export function telegramBotConfigured(): boolean {
  return botUsername().length > 0;
}
