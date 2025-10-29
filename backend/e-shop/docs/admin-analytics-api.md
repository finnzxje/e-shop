# Admin Analytics API

## Summary Snapshot

**Endpoint**: `GET /api/admin/analytics/summary`  
**Purpose**: Returns rollup metrics for the dashboard cards.  
**Auth**: Admin bearer token required.

### Query Parameters
- `period` (optional, default `30d`): Sliding time window ending at the current instant. Accepts positive integers suffixed with `d` (days) or `h` (hours). Example: `1d`, `7d`, `24h`. Values greater than `365d` or invalid formats return HTTP 400.

### Response

```json
{
  "revenue": 15234.75,
  "orders": 418,
  "capturedPayments": 14820.12,
  "newCustomers": 96,
  "averageOrderValue": 36.44,
  "conversionRate": 2.75
}
```

- `revenue`: Sum of `totalAmount` for orders captured during the window.
- `orders`: Count of non-cancelled orders placed during the window.
- `capturedPayments`: Captured transaction totals in the window (`capturedAmount` if present, otherwise `amount`).
- `newCustomers`: Users created during the window.
- `averageOrderValue`: Revenue divided by order count (0.00 if no orders).
- `conversionRate`: Orders ÷ product views × 100 (0.00 if no views or orders).

### Error Codes
- `400 Bad Request`: Unsupported `period` value (e.g., negative numbers, missing unit, exceeding 365 days).
- `401 Unauthorized`: Missing or invalid admin token.

### Notes
- All monetary fields are rounded to two decimal places.
- Conversion rate requires product view tracking (`product_views` table); absence of views yields `0.00`.

## Revenue Time Series

**Endpoint**: `GET /api/admin/analytics/revenue`  
**Purpose**: Provides per-bucket revenue trends for charts.  
**Auth**: Admin bearer token required.

### Query Parameters
- `start` (required): ISO-8601 timestamp (UTC) marking the inclusive window start.
- `end` (required): ISO-8601 timestamp (UTC) marking the exclusive window end. Must be after `start`.
- `interval` (optional, default `daily`): Either `daily` or `weekly`. Controls the bucket size (`date_trunc('day'|'week')`).

### Response

```json
[
  {
    "bucketStart": "2025-01-01T00:00:00Z",
    "bucketEnd": "2025-01-02T00:00:00Z",
    "orderCount": 42,
    "gross": 3120.75,
    "net": 3050.75,
    "refunds": 70.00
  }
]
```

- `gross`: Sum of captured order totals (`orders.total_amount`) within the bucket.
- `refunds`: Sum of payment transactions marked `VOIDED`, using `captured_amount` when present.
- `net`: `gross - refunds`, rounded to two decimals.
- Empty buckets inside the range return zeroed metrics with proper bucket boundaries.

### Error Codes
- `400 Bad Request`: Missing/invalid `start` or `end`, or unsupported `interval`.
- `401 Unauthorized`: Missing or invalid admin token.

### Notes
- Weekly buckets start on Monday at 00:00 in the application time zone (server default) to mirror Postgres `date_trunc('week', ...)` behaviour.
- `end` is treated as exclusive; provide the following day/week start to include the final bucket fully.
