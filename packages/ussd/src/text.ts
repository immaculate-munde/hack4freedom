/** Africa's Talking and most Kenyan aggregators cap a screen at 182 characters. */

export const USSD_SCREEN_LIMIT = 182;

export function con(message: string): string {
  return frame("CON", message);
}

export function end(message: string): string {
  return frame("END", message);
}

function frame(prefix: "CON" | "END", message: string): string {
  const text = message.replace(/\s+$/g, "").replace(/^\s+/g, "");
  const full = `${prefix} ${text}`;
  if (full.length <= USSD_SCREEN_LIMIT) return full;
  const room = USSD_SCREEN_LIMIT - prefix.length - 2;
  return `${prefix} ${text.slice(0, Math.max(0, room))}…`;
}

export function kes(amount: number): string {
  const grouped = Math.abs(Math.round(amount))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `KES ${grouped}`;
}
