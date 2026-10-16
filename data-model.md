# Data Model — v0.1

## Entities
- Branch: branch_id, name, city
- Product: product_id, name, category, active
- Sale: sale_id, branch_id, sold_at, status
- SaleItem: sale_item_id, sale_id, product_id, quantity, unit_price, discount
- ProductCost: product_id, effective_from, unit_cost
- InventorySnapshot: branch_id, product_id, snapshot_date, quantity_on_hand
- DatasetImport: import_id, dataset_type, imported_at, status
- ImportRowError: import_id, row_number, error_code

## Relationships
- Branch has many Sales.
- Sale has many SaleItems.
- Product appears in many SaleItems.
- ProductCost is time-effective.
- InventorySnapshot records product stock at a branch and date.

## Rules
Define returns, cancelled sales, discounts, duplicate records, missing costs, and invalid foreign keys before implementation.
