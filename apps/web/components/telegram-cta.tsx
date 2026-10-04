/**
 * Entry to the Telegram bot when TELEGRAM_BOT_USERNAME is published to the client.
 * Without the env, show how to wire it — do not invent a bot URL.
 */

const username =
  typeof process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME === "string"
    ? process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME.trim().replace(/^@/, "")
    : "";

export function TelegramCta({ className }: { className?: string }) {
  if (username) {
    return (
      <a
        href={`https://t.me/${username}`}
        target="_blank"
        rel="noreferrer"
        className={className ?? "btn btn-secondary rounded-full px-6"}
      >
        Open in Telegram
      </a>
    );
  }

  return (
    <p className="text-sm leading-6 text-slate">
      Telegram bot: set{" "}
      <code className="text-xs">NEXT_PUBLIC_TELEGRAM_BOT_USERNAME</code> and{" "}
      <code className="text-xs">TELEGRAM_BOT_TOKEN</code> in{" "}
      <code className="text-xs">apps/web/.env.local</code>, then open{" "}
      <code className="text-xs">t.me/&lt;bot&gt;</code>. Statements you send there
      leave your phone so the bot can build your picture. You still approve every
      purchase.
    </p>
  );
}

export function telegramBotConfigured(): boolean {
  return username.length > 0;
}
