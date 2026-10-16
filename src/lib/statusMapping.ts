/**
 * Normalizes the raw Arabic order-status strings from WOOD_DATA.xlsx into stable
 * machine codes used by the metrics and ontology endpoints.
 *
 * Mapping agreed with the project owner:
 *  - 'نم التسليم' is treated as a typo variant of 'تم التسليم' -> DELIVERED.
 *  - 'نم التصنيع' is treated as a typo variant of 'تم التصنيع' -> IN_PRODUCTION.
 * Any raw value not present in the map falls back to UNKNOWN.
 */

export const UNKNOWN_STATUS = 'UNKNOWN';

const STATUS_MAP: Readonly<Record<string, string>> = {
  'تم التسليم': 'DELIVERED',
  'نم التسليم': 'DELIVERED',
  'لغى': 'CANCELLED',
  'لاغى': 'CANCELLED',
  'لغي': 'CANCELLED',
  'مرتجع': 'RETURNED',
  'فشل التسليم': 'FAILED_DELIVERY',
  'مرفوض': 'REJECTED',
  'نم التصنيع': 'IN_PRODUCTION',
  'غير محدد': 'UNKNOWN',
};

export function normalizeStatus(raw: string): string {
  const key = String(raw ?? '').replace(/\s+/g, ' ').trim();
  return STATUS_MAP[key] ?? UNKNOWN_STATUS;
}

/** All normalized status codes the system understands. */
export const STATUS_CODES = [
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
  'FAILED_DELIVERY',
  'REJECTED',
  'IN_PRODUCTION',
  'UNKNOWN',
] as const;

export type StatusCode = (typeof STATUS_CODES)[number];

export function isStatusCode(value: string): value is StatusCode {
  return (STATUS_CODES as readonly string[]).includes(value);
}

/** First raw source value that maps to the given code, or null if none does. */
export function rawStatusForCode(code: string): string | null {
  const match = Object.keys(STATUS_MAP).find((raw) => STATUS_MAP[raw] === code);
  return match ?? null;
}
