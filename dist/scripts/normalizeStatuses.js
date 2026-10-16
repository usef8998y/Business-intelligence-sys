"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const statusMapping_1 = require("../lib/statusMapping");
/**
 * Migration: adds sale.status_normalized and backfills it from the raw
 * sale.status text using the agreed mapping (src/lib/statusMapping.ts).
 *
 * Idempotent: safe to run repeatedly. The raw status text is never modified.
 */
async function main() {
    const client = await database_1.pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('ALTER TABLE sale ADD COLUMN IF NOT EXISTS status_normalized TEXT');
        await client.query('CREATE INDEX IF NOT EXISTS idx_sale_status_normalized ON sale (status_normalized)');
        const distinct = await client.query('SELECT DISTINCT status FROM sale');
        for (const { status } of distinct.rows) {
            await client.query('UPDATE sale SET status_normalized = $1 WHERE status = $2', [
                (0, statusMapping_1.normalizeStatus)(status),
                status,
            ]);
        }
        const report = await client.query(`SELECT status AS raw, status_normalized AS normalized, COUNT(*)::int AS count
       FROM sale
       GROUP BY status, status_normalized
       ORDER BY status`);
        await client.query('COMMIT');
        console.log('Status normalization applied to sale.status_normalized:');
        console.table(report.rows);
        const unmapped = report.rows.filter((row) => row.normalized === statusMapping_1.UNKNOWN_STATUS && row.raw !== 'غير محدد');
        if (unmapped.length > 0) {
            console.log(`Note: ${unmapped.length} raw status value(s) fell back to UNKNOWN.`);
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
    console.error('Status migration failed:', error);
    await (0, database_1.closePool)();
    process.exitCode = 1;
});
//# sourceMappingURL=normalizeStatuses.js.map