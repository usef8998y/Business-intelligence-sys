"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRouter = void 0;
const express_1 = require("express");
const database_1 = require("../config/database");
exports.healthRouter = (0, express_1.Router)();
/**
 * @openapi
 * /api/health:
 *   get:
 *     tags: [Health]
 *     summary: API and database health check
 *     description: >
 *       Verifies the API is running and that the PostgreSQL database is reachable.
 *       Returns 200 when healthy, 503 when the database connection is unavailable.
 *     responses:
 *       200:
 *         description: Service healthy and database reachable.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: ok }
 *                 database: { type: string, example: up }
 *                 timestamp: { type: string, format: date-time }
 *       503:
 *         description: Service degraded because the database is unreachable.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: degraded }
 *                 database: { type: string, example: down }
 *                 timestamp: { type: string, format: date-time }
 */
exports.healthRouter.get('/health', async (_req, res) => {
    const databaseUp = await (0, database_1.checkDatabaseConnection)();
    res.status(databaseUp ? 200 : 503).json({
        status: databaseUp ? 'ok' : 'degraded',
        database: databaseUp ? 'up' : 'down',
        timestamp: new Date().toISOString(),
    });
});
//# sourceMappingURL=health.routes.js.map