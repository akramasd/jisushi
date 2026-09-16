/**
 * Danish phone numbers, normalised once.
 *
 * Customers type "31 33 44 86", "+45 31334486", "3133 4486", "0045 31334486".
 * Storing whatever they typed and searching for digits matched nothing — that
 * bug shipped, and this module is why it cannot ship again.
 */

/** Digits only, country code stripped. "+45 31 33 44 86" -> "31334486" */
export function normalisePhone(input: string): string {
  const digits = String(input ?? '').replace(/[^\d]/g, '')
  // 0045… and 45… are both the Danish country code in front of 8 digits.
  if (digits.length === 12 && digits.startsWith('0045')) return digits.slice(4)
  if (digits.length === 10 && digits.startsWith('45')) return digits.slice(2)
  return digits
}

export function isValidDanishMobile(input: string): boolean {
  const d = normalisePhone(input)
  // 8 digits, and Danish numbers never begin with 0 or 1.
  return d.length === 8 && !/^[01]/.test(d)
}

/** "31334486" -> "31 33 44 86", the way it is written on a receipt. */
export function formatDanishPhone(input: string): string {
  const d = normalisePhone(input)
  if (d.length !== 8) return String(input ?? '').trim()
  return d.replace(/(\d{2})(?=\d)/g, '$1 ').trim()
}
