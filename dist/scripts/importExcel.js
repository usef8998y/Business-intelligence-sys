"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const XLSX = __importStar(require("xlsx"));
const database_1 = require("../config/database");
const statusMapping_1 = require("../lib/statusMapping");
/**
 * Imports the retail orders workbook (default: WOOD_DATA.xlsx) into the
 * documented data model (branch / product / sale / sale_item).
 *
 * Mapping decisions agreed with the project owner:
 *  - branch      <- "منصة البيع" (sales platform); branch.city is unknown -> 'غير محدد'
 *  - product.name     <- "المنتج" text, falling back to the structured attributes
 *  - product.category <- "Column1" (product type, e.g. سرير / كنبة)
 *  - sale.sold_at     <- "ميعاد الطلب" (order date)
 *  - sale.status      <- "الحالة" stored verbatim (raw Arabic text)
 *  - sale_item        <- quantity 1 (no quantity column exists), unit_price = "سعر البيع",
 *                        discount 0 (the second amount column is ambiguous and is not used)
 *
 * The source file has no product-cost or inventory data, so product_cost and
 * inventory_snapshot are intentionally left empty (missing costs are never inferred).
 * Rows that fail validation are recorded in import_row_error and skipped.
 *
 * NOTE: this is a seed script. It clears the domain tables before loading so the
 * command can be re-run safely.
 */
const SHEET_NAME = 'البيانات';
const DEFAULT_FILE = 'WOOD_DATA.xlsx';
const UNKNOWN = 'غير محدد';
// Plausible business-date range. Guards against typo'd years (e.g. "224")
// silently becoming valid years far outside the dataset's era.
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;
// Column indexes in the "البيانات" sheet (0-based, from the header row).
const COL = {
    PLATFORM: 5,
    TYPE: 6,
    SUBTYPE: 7,
    MODEL: 8,
    SIZE: 9,
    METAL_COLOR: 10,
    FABRIC_COLOR: 11,
    PRODUCT: 12,
    PRICE: 13,
    ORDER_DATE: 15,
    STATUS: 19,
};
function normalizeDigits(input) {
    return input
        .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
        .replace(/[\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}
function toStr(value) {
    if (value === null || value === undefined)
        return '';
    if (value instanceof Date)
        return value.toISOString();
    return String(value).replace(/\s+/g, ' ').trim();
}
function toNumber(value) {
    if (typeof value === 'number')
        return Number.isFinite(value) ? value : null;
    if (typeof value === 'string') {
        const cleaned = normalizeDigits(value).replace(/[,\s]/g, '');
        if (cleaned === '')
            return null;
        const parsed = Number(cleaned);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}
/** Parses Excel serial numbers and d/m/yyyy strings into a UTC-midnight Date. */
function parseDate(value) {
    const parsed = parseRawDate(value);
    if (!parsed)
        return null;
    const year = parsed.getUTCFullYear();
    return year >= MIN_YEAR && year <= MAX_YEAR ? parsed : null;
}
function parseRawDate(value) {
    if (value instanceof Date)
        return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value === 'number' && Number.isFinite(value)) {
        // Excel 1900 date system: 25569 days between 1899-12-30 and 1970-01-01.
        const date = new Date(Math.round((value - 25569) * 86400 * 1000));
        return Number.isNaN(date.getTime()) ? null : date;
    }
    if (typeof value === 'string') {
        const match = normalizeDigits(value.trim()).match(/^(\d{1,4})[\\/\-.](\d{1,2})[\\/\-.](\d{1,4})$/);
        if (!match)
            return null;
        let day = Number(match[1]);
        let month = Number(match[2]);
        let year = Number(match[3]);
        if (match[1].length === 4) {
            year = Number(match[1]);
            month = Number(match[2]);
            day = Number(match[3]);
        }
        const date = new Date(Date.UTC(year, month - 1, day));
        const valid = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
        return valid ? date : null;
    }
    return null;
}
function buildProductName(row) {
    const direct = toStr(row[COL.PRODUCT]);
    if (direct)
        return direct;
    return [COL.TYPE, COL.SUBTYPE, COL.MODEL, COL.SIZE, COL.METAL_COLOR, COL.FABRIC_COLOR]
        .map((index) => toStr(row[index]))
        .filter(Boolean)
        .join(' ');
}
async function getBranchId(client, cache, name) {
    const cached = cache.get(name);
    if (cached !== undefined)
        return cached;
    const result = await client.query('INSERT INTO branch (name, city) VALUES ($1, $2) RETURNING branch_id', [name, UNKNOWN]);
    const id = result.rows[0].branch_id;
    cache.set(name, id);
    return id;
}
async function getProductId(client, cache, name, category) {
    const key = `${category}||${name}`;
    const cached = cache.get(key);
    if (cached !== undefined)
        return cached;
    const result = await client.query('INSERT INTO product (name, category, active) VALUES ($1, $2, $3) RETURNING product_id', [name, category, true]);
    const id = result.rows[0].product_id;
    cache.set(key, id);
    return id;
}
async function main() {
    const filePath = path_1.default.resolve(process.cwd(), process.argv[2] ?? DEFAULT_FILE);
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[SHEET_NAME];
    if (!sheet) {
        throw new Error(`Sheet "${SHEET_NAME}" not found in ${filePath}`);
    }
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
    const dataRows = rows
        .slice(1)
        .map((row, index) => ({ rowNumber: index + 2, row }))
        .filter(({ row }) => row.some((cell) => cell !== null && cell !== ''));
    console.log(`File:   ${filePath}`);
    console.log(`Sheet:  ${SHEET_NAME}`);
    console.log(`Rows:   ${dataRows.length}`);
    const client = await database_1.pool.connect();
    const errors = [];
    let salesInserted = 0;
    let itemsInserted = 0;
    try {
        await client.query('BEGIN');
        await client.query(`TRUNCATE branch, product, sale, sale_item, product_cost, inventory_snapshot, dataset_import, import_row_error
       RESTART IDENTITY CASCADE`);
        console.log('Cleared existing rows from domain tables.');
        const importResult = await client.query('INSERT INTO dataset_import (dataset_type, status) VALUES ($1, $2) RETURNING import_id', ['sales_orders', 'processing']);
        const importId = importResult.rows[0].import_id;
        const branchCache = new Map();
        const productCache = new Map();
        for (const { rowNumber, row } of dataRows) {
            const platform = toStr(row[COL.PLATFORM]);
            const soldAt = parseDate(row[COL.ORDER_DATE]);
            const price = toNumber(row[COL.PRICE]);
            if (!platform) {
                errors.push({ rowNumber, errorCode: 'MISSING_BRANCH' });
                continue;
            }
            if (!soldAt) {
                errors.push({ rowNumber, errorCode: 'INVALID_ORDER_DATE' });
                continue;
            }
            if (price === null || price < 0) {
                errors.push({ rowNumber, errorCode: 'INVALID_PRICE' });
                continue;
            }
            const productName = buildProductName(row);
            if (!productName) {
                errors.push({ rowNumber, errorCode: 'MISSING_PRODUCT' });
                continue;
            }
            const category = toStr(row[COL.TYPE]) || UNKNOWN;
            const rawStatus = toStr(row[COL.STATUS]) || UNKNOWN;
            const statusNormalized = (0, statusMapping_1.normalizeStatus)(rawStatus);
            const branchId = await getBranchId(client, branchCache, platform);
            const productId = await getProductId(client, productCache, productName, category);
            const saleResult = await client.query('INSERT INTO sale (branch_id, sold_at, status, status_normalized) VALUES ($1, $2, $3, $4) RETURNING sale_id', 
            // toISOString keeps the value at UTC midnight of the calendar date;
            // passing a Date object would let the driver apply the local offset.
            [branchId, soldAt.toISOString(), rawStatus, statusNormalized]);
            const saleId = saleResult.rows[0].sale_id;
            salesInserted += 1;
            await client.query('INSERT INTO sale_item (sale_id, product_id, quantity, unit_price, discount) VALUES ($1, $2, $3, $4, $5)', [saleId, productId, 1, price, 0]);
            itemsInserted += 1;
        }
        for (const error of errors) {
            await client.query('INSERT INTO import_row_error (import_id, row_number, error_code) VALUES ($1, $2, $3)', [importId, error.rowNumber, error.errorCode]);
        }
        await client.query('UPDATE dataset_import SET status = $1 WHERE import_id = $2', [
            errors.length > 0 ? 'completed_with_errors' : 'completed',
            importId,
        ]);
        await client.query('COMMIT');
        console.log('');
        console.log('Import summary');
        console.log(`  import_id:      ${importId}`);
        console.log(`  branches:       ${branchCache.size}`);
        console.log(`  products:       ${productCache.size}`);
        console.log(`  sales:          ${salesInserted}`);
        console.log(`  sale_items:     ${itemsInserted}`);
        console.log(`  row errors:     ${errors.length}`);
        if (errors.length > 0) {
            const byCode = errors.reduce((acc, error) => {
                acc[error.errorCode] = (acc[error.errorCode] ?? 0) + 1;
                return acc;
            }, {});
            console.log(`  error codes:    ${JSON.stringify(byCode)}`);
        }
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
}
main()
    .then(() => (0, database_1.closePool)())
    .catch(async (error) => {
    console.error('Import failed:', error);
    await (0, database_1.closePool)();
    process.exitCode = 1;
});
//# sourceMappingURL=importExcel.js.map