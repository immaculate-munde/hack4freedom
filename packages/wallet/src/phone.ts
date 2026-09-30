/**
 * Kenyan phone helpers for Bitika (254…) and bitcoin.co.ke (07…@bitcoin.co.ke).
 */

const DIGITS_ONLY = /^\d+$/;

function digits(input: string): string {
  return input.replace(/\s/g, "").replace(/^\+/, "");
}

/** Bitika expects 254712345678 (no +, no leading 0). */
export function toBitikaPhone(input: string): string {
  let p = digits(input);
  if (p.startsWith("0")) {
    p = `254${p.slice(1)}`;
  }
  if (!p.startsWith("254")) {
    throw new Error("Phone number must be a Kenyan M-Pesa number.");
  }
  if (!DIGITS_ONLY.test(p) || p.length < 11 || p.length > 13) {
    throw new Error("Phone number does not look valid.");
  }
  return p;
}

/** Short form recommended by bitcoin.co.ke for LNURL pay hand-off. */
export function toBitcoinCoKeLightningAddress(input: string): string {
  const canonical = toBitikaPhone(input);
  const local = `0${canonical.slice(3)}`;
  return `${local}@bitcoin.co.ke`;
}

/** Mask for display: 2547XX***678 */
export function maskPhone(input: string): string {
  const p = toBitikaPhone(input);
  if (p.length < 8) return "***";
  return `${p.slice(0, 5)}***${p.slice(-3)}`;
}
