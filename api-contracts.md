# API Contracts — proposed v0.1

- POST /api/imports — upload a CSV dataset; return import ID, status, accepted row count and error summary.
- GET /api/imports/:id — retrieve import status and validation summary.
- GET /api/metrics/overview?from=YYYY-MM-DD&to=YYYY-MM-DD — retrieve supported KPIs for a period.
- POST /api/analysis/questions — submit a supported question and return a structured analysis result with evidence.
- GET /api/recommendations — list recommendations and their review states.
- POST /api/recommendations/:id/review — record an approved or rejected decision.

These are proposed contracts, not implemented endpoints. Agree on exact request/response schemas, error codes, pagination, and validation before coding.
