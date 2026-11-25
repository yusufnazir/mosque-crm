/**
 * Phone number display helpers.
 *
 * Businesses store numbers in E.164-ish form (`+5976584562`). A raw run of digits
 * is hard to scan — especially on a phone — so we group the national part for
 * display while keeping the exact digits for the `tel:` link.
 *
 * Examples
 *   formatPhoneNumber('+5976584562')  -> '+597 658-4562'
 *   formatPhoneNumber('+5978706021')  -> '+597 870-6021'
 *   formatPhoneNumber('06 12345678')  -> '06 1234 5678'
 */

/** Calling codes we can reliably split off a leading `+` number (longest first). */
const COUNTRY_CODES = [
  '597', '599', '598', '596', '595', '594', '593', '592', '591', '590',
  '55', '54', '53', '52', '51', '49', '48', '47', '46', '45', '44', '43', '41',
  '40', '39', '36', '34', '33', '32', '31', '30', '27', '20', '7', '1',
];

function groupNational(digits: string): string {
  if (digits.startsWith('0') && digits.length === 10) {
    // National trunk prefix: 0612345678 -> 06 1234 5678
    return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`;
  }
  switch (digits.length) {
    case 7:
      // Suriname: 6584562 -> 658-4562
      return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    case 8:
      return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    case 9:
    case 10:
      return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    default:
      return (digits.match(/.{1,3}/g) ?? [digits]).join(' ');
  }
}

/** Human-readable phone number (never throws, returns the input when it cannot parse). */
export function formatPhoneNumber(raw?: string | null): string {
  if (!raw) return '';
  const trimmed = String(raw).trim();
  if (!trimmed) return '';

  const isInternational = trimmed.startsWith('+') || /^00\d/.test(trimmed);
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 7) return trimmed;

  if (!isInternational) {
    return groupNational(digits);
  }

  const normalized = digits.startsWith('00') ? digits.slice(2) : digits;
  const code = COUNTRY_CODES.find(
    (candidate) => normalized.startsWith(candidate) && normalized.length - candidate.length >= 6
  );
  if (!code) return `+${groupNational(normalized)}`;
  return `+${code} ${groupNational(normalized.slice(code.length))}`;
}

/** Clickable `tel:` href that keeps the raw digits (never the display spacing). */
export function phoneHref(raw?: string | null): string {
  if (!raw) return '';
  const digits = String(raw).replace(/[^\d+]/g, '');
  return `tel:${digits}`;
}
