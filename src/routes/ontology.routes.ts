import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { STATUS_CODES, isStatusCode, rawStatusForCode } from '../lib/statusMapping';

export const ontologyRouter = Router();

/**
 * Palantir-style "Ontology" endpoints over the retail data model.
 *
 * Agreed conventions:
 *  - Revenue counts DELIVERED sales only and equals
 *    SUM(sale_item.quantity * sale_item.unit_price - sale_item.discount).
 *  - There is no supplier entity in the data model, so /suppliers returns an
 *    empty list with an explicit reason instead of fabricated data.
 *  - Write actions validate input against a fixed allow-list of status codes;
 *    no client-supplied SQL is executed (all queries are parameterized).
 */

const REVENUE_STATUS = 'DELIVERED';
const REVENUE_FORMULA = 'SUM(sale_item.quantity * sale_item.unit_price - sale_item.discount)';

function handleError(res: Response, error: unknown): void {
  console.error('Ontology endpoint failed', error);
  res.status(500).json({ error: 'INTERNAL_ERROR' });
}

/**
 * @openapi
 * /api/ontology/suppliers:
 *   get:
 *     tags: [Ontology]
 *     summary: List suppliers and aggregate metrics
 *     description: >
 *       Returns the supplier objects and their aggregate metrics. There is no
 *       supplier entity in the documented data model and the source dataset
 *       contains no supplier data, so the list is empty and a `note` explains why.
 *     responses:
 *       200:
 *         description: Supplier list (empty while no supplier entity exists).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 suppliers:
 *                   type: array
 *                   items:
 *                     type: object
 *                 count:
 *                   type: integer
 *                   example: 0
 *                 note:
 *                   type: string
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
ontologyRouter.get('/ontology/suppliers', (_req: Request, res: Response) => {
  res.json({
    suppliers: [],
    count: 0,
    note:
      'No supplier entity exists in the data model (data-model.md) and the source dataset ' +
      '(WOOD_DATA.xlsx) contains no supplier data. Returning an empty list rather than ' +
      'fabricating suppliers. Add a supplier entity and source data to populate this endpoint.',
  });
});

/**
 * @openapi
 * /api/ontology/revenue:
 *   get:
 *     tags: [Ontology]
 *     summary: Revenue breakdown by branch and product
 *     description: >
 *       Revenue counts DELIVERED sales only and equals
 *       SUM(sale_item.quantity * sale_item.unit_price - sale_item.discount).
 *     responses:
 *       200:
 *         description: Revenue grouped by branch and by product.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 basis:
 *                   $ref: '#/components/schemas/Basis'
 *                 byBranch:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       branchId: { type: integer }
 *                       branch: { type: string }
 *                       revenue: { type: number }
 *                       orders: { type: integer }
 *                       quantity: { type: integer }
 *                 byProduct:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       productId: { type: integer }
 *                       product: { type: string }
 *                       category: { type: string }
 *                       revenue: { type: number }
 *                       quantity: { type: integer }
 *                       orders: { type: integer }
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
ontologyRouter.get('/ontology/revenue', async (_req: Request, res: Response) => {
  try {
    const byBranch = await pool.query(
      `SELECT b.branch_id AS "branchId",
              b.name      AS "branch",
              COALESCE(SUM(si.quantity * si.unit_price - si.discount), 0)::float8 AS "revenue",
              COUNT(DISTINCT s.sale_id)::int AS "orders",
              COALESCE(SUM(si.quantity), 0)::int AS "quantity"
         FROM sale s
         JOIN branch b     ON b.branch_id = s.branch_id
         JOIN sale_item si ON si.sale_id = s.sale_id
        WHERE s.status_normalized = $1
        GROUP BY b.branch_id, b.name
        ORDER BY "revenue" DESC`,
      [REVENUE_STATUS]
    );

    const byProduct = await pool.query(
      `SELECT p.product_id AS "productId",
              p.name       AS "product",
              p.category   AS "category",
              COALESCE(SUM(si.quantity * si.unit_price - si.discount), 0)::float8 AS "revenue",
              COALESCE(SUM(si.quantity), 0)::int AS "quantity",
              COUNT(DISTINCT s.sale_id)::int AS "orders"
         FROM sale s
         JOIN sale_item si ON si.sale_id = s.sale_id
         JOIN product p    ON p.product_id = si.product_id
        WHERE s.status_normalized = $1
        GROUP BY p.product_id, p.name, p.category
        ORDER BY "revenue" DESC`,
      [REVENUE_STATUS]
    );

    res.json({
      basis: { statusFilter: REVENUE_STATUS, formula: REVENUE_FORMULA },
      byBranch: byBranch.rows,
      byProduct: byProduct.rows,
    });
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * @openapi
 * /api/ontology/summary:
 *   get:
 *     tags: [Ontology]
 *     summary: Total revenue, order count and status breakdown
 *     description: >
 *       Returns total revenue (DELIVERED sales only), the overall order count,
 *       delivered vs. cancelled counts, and the full orders-by-status breakdown.
 *     responses:
 *       200:
 *         description: Aggregate order summary.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalRevenue: { type: number, example: 995080.91 }
 *                 orderCount: { type: integer, example: 120 }
 *                 deliveredOrders: { type: integer, example: 97 }
 *                 cancelledOrders: { type: integer, example: 14 }
 *                 ordersByStatus:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       status: { type: string, example: DELIVERED }
 *                       count: { type: integer }
 *                 basis:
 *                   $ref: '#/components/schemas/Basis'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
ontologyRouter.get('/ontology/summary', async (_req: Request, res: Response) => {
  try {
    const totals = await pool.query<{
      totalRevenue: number;
      orderCount: number;
      deliveredOrders: number;
      cancelledOrders: number;
    }>(
      `SELECT
         (SELECT COALESCE(SUM(si.quantity * si.unit_price - si.discount), 0)::float8
            FROM sale s
            JOIN sale_item si ON si.sale_id = s.sale_id
           WHERE s.status_normalized = $1)                       AS "totalRevenue",
         (SELECT COUNT(*)::int FROM sale)                        AS "orderCount",
         (SELECT COUNT(*)::int FROM sale WHERE status_normalized = 'DELIVERED') AS "deliveredOrders",
         (SELECT COUNT(*)::int FROM sale WHERE status_normalized = 'CANCELLED') AS "cancelledOrders"`,
      [REVENUE_STATUS]
    );

    const byStatus = await pool.query<{ status: string | null; count: number }>(
      `SELECT COALESCE(status_normalized, 'UNKNOWN') AS status, COUNT(*)::int AS count
         FROM sale
        GROUP BY COALESCE(status_normalized, 'UNKNOWN')
        ORDER BY count DESC`
    );

    res.json({
      ...totals.rows[0],
      ordersByStatus: byStatus.rows,
      basis: { statusFilter: REVENUE_STATUS, formula: REVENUE_FORMULA },
    });
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * @openapi
 * /api/ontology/orders/{id}/status:
 *   post:
 *     tags: [Actions]
 *     summary: Update an order's status
 *     description: >
 *       Palantir-style write action that updates a single order's status in
 *       PostgreSQL. The body `status` must be one of the allowed normalized
 *       status codes. Both `sale.status` (canonical source label) and
 *       `sale.status_normalized` (machine code used by metrics) are updated
 *       consistently inside a single parameterized UPDATE.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The order (sale) identifier.
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 description: Allowed normalized status code.
 *                 enum:
 *                   - DELIVERED
 *                   - CANCELLED
 *                   - RETURNED
 *                   - FAILED_DELIVERY
 *                   - REJECTED
 *                   - IN_PRODUCTION
 *                   - UNKNOWN
 *           example:
 *             status: DELIVERED
 *     responses:
 *       200:
 *         description: The updated order.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 order:
 *                   type: object
 *                   properties:
 *                     saleId: { type: integer }
 *                     branchId: { type: integer }
 *                     soldAt: { type: string, format: date-time }
 *                     status: { type: string }
 *                     statusNormalized: { type: string, example: DELIVERED }
 *       400:
 *         description: Invalid order id or unsupported status code.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Order not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
ontologyRouter.post('/ontology/orders/:id/status', async (req: Request, res: Response) => {
  const saleId = Number(req.params.id);
  if (!Number.isInteger(saleId) || saleId <= 0) {
    res.status(400).json({ error: 'INVALID_ORDER_ID', message: 'Order id must be a positive integer.' });
    return;
  }

  const rawStatus = typeof req.body?.status === 'string' ? req.body.status.trim() : '';
  const code = rawStatus.toUpperCase();
  if (!isStatusCode(code)) {
    res.status(400).json({
      error: 'INVALID_STATUS',
      message: `status must be one of: ${STATUS_CODES.join(', ')}`,
    });
    return;
  }

  try {
    const result = await pool.query(
      `UPDATE sale
          SET status            = $2,
              status_normalized = $1
        WHERE sale_id = $3
    RETURNING sale_id         AS "saleId",
              branch_id       AS "branchId",
              sold_at         AS "soldAt",
              status,
              status_normalized AS "statusNormalized"`,
      [code, rawStatusForCode(code) ?? code, saleId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'ORDER_NOT_FOUND', message: `No order with id ${saleId}.` });
      return;
    }

    res.json({ order: result.rows[0] });
  } catch (error) {
    handleError(res, error);
  }
});
