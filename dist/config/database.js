"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.checkDatabaseConnection = checkDatabaseConnection;
exports.closePool = closePool;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
function buildPoolConfig() {
    // DATABASE_URL takes precedence when provided; otherwise use discrete values.
    if (process.env.DATABASE_URL) {
        return { connectionString: process.env.DATABASE_URL };
    }
    return {
        host: process.env.DB_HOST ?? 'localhost',
        port: Number(process.env.DB_PORT ?? 5432),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    };
}
exports.pool = new pg_1.Pool(buildPoolConfig());
// Surface idle-client errors instead of crashing the process silently.
exports.pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
});
/**
 * Runs a lightweight query to confirm the database is reachable.
 * Resolves to true when the connection is healthy, false otherwise.
 */
async function checkDatabaseConnection() {
    try {
        const result = await exports.pool.query('SELECT 1 AS ok');
        return result.rows[0]?.ok === 1;
    }
    catch (error) {
        console.error('Database health check failed', error);
        return false;
    }
}
async function closePool() {
    await exports.pool.end();
}
//# sourceMappingURL=database.js.map