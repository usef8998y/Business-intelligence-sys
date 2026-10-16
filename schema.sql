-- Retail BI MVP — PostgreSQL schema
-- Derived from data-model.md (v0.1). Field names follow the documented entities.
-- Business rules still requiring agreement (see data-model.md / metric-definitions.md):
--   returns, cancelled sales, discount handling, duplicate records,
--   missing historical costs, invalid foreign keys, timezone and date boundaries.
-- Those rules are intentionally NOT hardcoded here; they are left as explicit,
-- documented points to resolve before the corresponding endpoints are implemented.

BEGIN;

-- Branch: branch_id, name, city
CREATE TABLE IF NOT EXISTS branch (
    branch_id   SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    city        TEXT NOT NULL
);

-- Product: product_id, name, category, active
CREATE TABLE IF NOT EXISTS product (
    product_id  SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    category    TEXT NOT NULL,
    active      BOOLEAN NOT NULL DEFAULT TRUE
);

-- Sale: sale_id, branch_id, sold_at, status
-- NOTE: allowed `status` values (e.g. completed/cancelled/returned) are pending
-- agreement and therefore intentionally not constrained yet.
-- `status_normalized` holds a derived machine code; the raw text in `status` is
-- preserved. See src/lib/statusMapping.ts for the agreed raw -> code mapping.
CREATE TABLE IF NOT EXISTS sale (
    sale_id           SERIAL PRIMARY KEY,
    branch_id         INTEGER NOT NULL REFERENCES branch (branch_id),
    sold_at           TIMESTAMPTZ NOT NULL,
    status            TEXT NOT NULL,
    status_normalized TEXT
);

-- SaleItem: sale_item_id, sale_id, product_id, quantity, unit_price, discount
CREATE TABLE IF NOT EXISTS sale_item (
    sale_item_id SERIAL PRIMARY KEY,
    sale_id      INTEGER NOT NULL REFERENCES sale (sale_id) ON DELETE CASCADE,
    product_id   INTEGER NOT NULL REFERENCES product (product_id),
    quantity     INTEGER NOT NULL CHECK (quantity > 0),
    unit_price   NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    discount     NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount >= 0)
);

-- ProductCost: product_id, effective_from, unit_cost (time-effective)
CREATE TABLE IF NOT EXISTS product_cost (
    product_id      INTEGER NOT NULL REFERENCES product (product_id),
    effective_from  DATE NOT NULL,
    unit_cost       NUMERIC(12, 2) NOT NULL CHECK (unit_cost >= 0),
    PRIMARY KEY (product_id, effective_from)
);

-- InventorySnapshot: branch_id, product_id, snapshot_date, quantity_on_hand
CREATE TABLE IF NOT EXISTS inventory_snapshot (
    branch_id          INTEGER NOT NULL REFERENCES branch (branch_id),
    product_id         INTEGER NOT NULL REFERENCES product (product_id),
    snapshot_date      DATE NOT NULL,
    quantity_on_hand   INTEGER NOT NULL CHECK (quantity_on_hand >= 0),
    PRIMARY KEY (branch_id, product_id, snapshot_date)
);

-- DatasetImport: import_id, dataset_type, imported_at, status
CREATE TABLE IF NOT EXISTS dataset_import (
    import_id      SERIAL PRIMARY KEY,
    dataset_type   TEXT NOT NULL,
    imported_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    status         TEXT NOT NULL
);

-- ImportRowError: import_id, row_number, error_code
-- Surrogate PK added so multiple errors per (import_id, row_number) are storable.
CREATE TABLE IF NOT EXISTS import_row_error (
    import_row_error_id  SERIAL PRIMARY KEY,
    import_id            INTEGER NOT NULL REFERENCES dataset_import (import_id) ON DELETE CASCADE,
    row_number           INTEGER NOT NULL CHECK (row_number > 0),
    error_code           TEXT NOT NULL
);

-- Relationships
CREATE INDEX IF NOT EXISTS idx_sale_branch_id ON sale (branch_id);
CREATE INDEX IF NOT EXISTS idx_sale_sold_at ON sale (sold_at);
CREATE INDEX IF NOT EXISTS idx_sale_status_normalized ON sale (status_normalized);
CREATE INDEX IF NOT EXISTS idx_sale_item_sale_id ON sale_item (sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_item_product_id ON sale_item (product_id);
CREATE INDEX IF NOT EXISTS idx_product_cost_product_id ON product_cost (product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_snapshot_product_id ON inventory_snapshot (product_id);
CREATE INDEX IF NOT EXISTS idx_import_row_error_import_id ON import_row_error (import_id);

COMMIT;
