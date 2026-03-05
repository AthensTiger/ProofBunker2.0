/**
 * Round a proof value to at most 2 decimal places and strip trailing zeros.
 * Handles floating-point precision artifacts (e.g. 110.00000000000001 → "110").
 * Returns empty string for null/undefined.
 */
export function formatProof(value: number | null | undefined): string {
  if (value == null) return '';
  return parseFloat(Number(value).toFixed(2)).toString();
}

/**
 * Parse an age statement string into a numeric value.
 * Strips suffixes like "Year", "Years", "Yr", "yr old", etc.
 * Returns null for NAS or unparseable values.
 */
export function parseAgeStatement(raw: string | null | undefined): number | null {
  if (raw == null || raw === '') return null;
  const trimmed = raw.trim();
  if (trimmed.toUpperCase() === 'NAS') return null;
  const match = trimmed.match(/^(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}

/**
 * Format an age statement for display: "12 Years", "NAS", etc.
 * Accepts raw DB values like "12", "12 Year", "NAS", or a number.
 */
export function formatAgeStatement(raw: string | number | null | undefined): string {
  if (raw == null || raw === '') return '';
  const str = String(raw).trim();
  if (str.toUpperCase() === 'NAS') return 'NAS';
  const num = parseAgeStatement(str);
  if (num == null) return str;
  return num === 1 ? '1 Year' : `${num} Years`;
}

/**
 * Normalize an age statement for storage: just the number, or "NAS".
 */
export function normalizeAgeStatement(raw: string | null | undefined): string | null {
  if (raw == null || raw === '') return null;
  const trimmed = raw.trim();
  if (trimmed.toUpperCase() === 'NAS') return 'NAS';
  const num = parseAgeStatement(trimmed);
  if (num == null) return trimmed;
  return String(num);
}
