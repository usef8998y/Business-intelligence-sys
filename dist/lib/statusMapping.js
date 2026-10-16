"use strict";
/**
 * Normalizes the raw Arabic order-status strings from WOOD_DATA.xlsx into stable
 * machine codes used by the metrics and ontology endpoints.
 *
 * Mapping agreed with the project owner:
 *  - 'نم التسليم' is treated as a typo variant of 'تم التسليم' -> DELIVERED.
 *  - 'نم التصنيع' is treated as a typo variant of 'تم التصنيع' -> IN_PRODUCTION.
 * Any raw value not present in the map falls back to UNKNOWN.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.STATUS_CODES = exports.UNKNOWN_STATUS = void 0;
exports.normalizeStatus = normalizeStatus;
exports.isStatusCode = isStatusCode;
exports.rawStatusForCode = rawStatusForCode;
exports.UNKNOWN_STATUS = 'UNKNOWN';
const STATUS_MAP = {
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
function normalizeStatus(raw) {
    const key = String(raw ?? '').replace(/\s+/g, ' ').trim();
    return STATUS_MAP[key] ?? exports.UNKNOWN_STATUS;
}
/** All normalized status codes the system understands. */
exports.STATUS_CODES = [
    'DELIVERED',
    'CANCELLED',
    'RETURNED',
    'FAILED_DELIVERY',
    'REJECTED',
    'IN_PRODUCTION',
    'UNKNOWN',
];
function isStatusCode(value) {
    return exports.STATUS_CODES.includes(value);
}
/** First raw source value that maps to the given code, or null if none does. */
function rawStatusForCode(code) {
    const match = Object.keys(STATUS_MAP).find((raw) => STATUS_MAP[raw] === code);
    return match ?? null;
}
//# sourceMappingURL=statusMapping.js.map