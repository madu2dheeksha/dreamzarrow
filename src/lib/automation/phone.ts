/**
 * Normalise a phone number to the form WhatsApp uses as a user id:
 * digits only, including the country code, no "+" (e.g. "919876543210").
 * Numbers without a country code are treated as Indian.
 * Returns null when the input cannot be a valid WhatsApp number.
 */
export function normalizePhone(input: string, defaultCountryCode = "91"): string | null {
  const trimmed = input.trim();
  const hasPlus = trimmed.startsWith("+");
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  if (hasPlus) {
    // Already international.
  } else if (digits.startsWith("00")) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = defaultCountryCode + digits.slice(1);
  } else if (digits.length === 10) {
    digits = defaultCountryCode + digits;
  }

  // Indian mobiles: 91 + 10 digits starting 6–9.
  if (digits.startsWith("91") && digits.length === 12) {
    return /^91[6-9]\d{9}$/.test(digits) ? digits : null;
  }
  // E.164 allows up to 15 digits; shortest real mobile numbers are ~8 digits with country code.
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

/** "919876543210" → "+91 98765 43210" for display. */
export function formatPhone(waId: string) {
  if (/^91\d{10}$/.test(waId)) return `+91 ${waId.slice(2, 7)} ${waId.slice(7)}`;
  return `+${waId}`;
}
