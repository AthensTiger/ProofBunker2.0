/**
 * Round a proof value to at most 2 decimal places and strip trailing zeros.
 * Handles floating-point precision artifacts (e.g. 110.00000000000001 → "110").
 * Returns empty string for null/undefined.
 */
export function formatProof(value: number | null | undefined): string {
  if (value == null) return '';
  return parseFloat(Number(value).toFixed(2)).toString();
}
