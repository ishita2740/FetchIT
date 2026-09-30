/**
 * Normalizes and validates Indian mobile phone numbers to E.164 format (+91XXXXXXXXXX).
 * 
 * Supports formats such as:
 * - "9876543210"
 * - "+919876543210"
 * - "+91 98765 43210"
 * - "09876543210"
 * - "+91-98765-43210"
 * 
 * Valid Indian mobile numbers are 10 digits starting with 6, 7, 8, or 9.
 */
export function normalizeIndianPhoneNumber(input: string): string | null {
  if (!input || typeof input !== "string") {
    return null;
  }

  // Remove whitespace, dashes, parentheses, dots
  const cleaned = input.trim().replace(/[\s\-\(\)\.]/g, "");

  let tenDigits = "";

  if (cleaned.startsWith("+91")) {
    tenDigits = cleaned.slice(3);
  } else if (cleaned.startsWith("91") && cleaned.length === 12) {
    tenDigits = cleaned.slice(2);
  } else if (cleaned.startsWith("0") && cleaned.length === 11) {
    tenDigits = cleaned.slice(1);
  } else if (/^\d{10}$/.test(cleaned)) {
    tenDigits = cleaned;
  } else {
    return null;
  }

  // Indian mobile numbers must be 10 digits starting with 6, 7, 8, or 9
  if (!/^[6-9]\d{9}$/.test(tenDigits)) {
    return null;
  }

  return `+91${tenDigits}`;
}
