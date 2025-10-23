# Orders & VNPay Checkout API

Base URL: `/api/orders`

## POST `/checkout`

Creates an order from the authenticated user's active cart and returns the VNPay payment URL.

### Authentication

Requires a valid JWT access token. The user's email (subject) is used to resolve the cart and address data.

### Request Body

```json
{
  "addressId": "8b1a9953-c461-42e6-baf0-3dfb4c701d89",
  "address": {
    "label": "Home",
    "recipientName": "Nguyen Van A",
    "phone": "+84-901-234-567",
    "line1": "12 Ly Thuong Kiet",
    "line2": "Apartment 1005",
    "city": "Ha Noi",
    "stateProvince": "Hoan Kiem",
    "postalCode": "100000",
    "countryCode": "VN",
    "instructions": "Call when arriving"
  },
  "saveAddress": true,
  "shippingAmount": 2.5,
  "discountAmount": 5.0,
  "taxAmount": 0.0,
  "shippingMethod": "standard",
  "notes": "Gift wrap if possible"
}
```

- `addressId` (optional) — existing address owned by the user. If supplied, `address` is ignored except for `instructions`.
- `address` (optional) — required when `addressId` is omitted; used to snapshot shipping info and optionally persist to the address book.
- `saveAddress` — when true, the provided `address` is stored in the address book before checkout. Defaults to `false`.
- `shippingAmount`, `discountAmount`, `taxAmount` — non-negative monetary adjustments (USD, 2 decimal places). Omitted values default to `0.00`.
- `shippingMethod`, `notes` — free-form metadata persisted with the order.

The cart must contain at least one item; otherwise the API responds with `400 Bad Request`.

### Response

```
Status: 201 Created
Content-Type: application/json
```

```json
{
  "orderId": "6e9c1fd7-4243-4a7a-9e3d-1d49f21b8c44",
  "orderNumber": "ORD-00010234",
  "status": "AWAITING_PAYMENT",
  "paymentStatus": "PENDING",
  "subtotalAmount": 124.98,
  "discountAmount": 5.0,
  "shippingAmount": 2.5,
  "taxAmount": 0.0,
  "totalAmount": 122.48,
  "currency": "USD",
  "totalAmountVnd": 3230516.46,
  "paymentProvider": "VNPAY",
  "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?…",
  "paymentUrlExpiresAt": "2024-04-02T13:45:10Z",
  "items": [
    {
      "productId": "d53c16a4-beb5-4a97-b992-ef7fb8cfe5b8",
      "variantId": "4a23ab92-8c62-4e80-81d8-6a06fb4048a4",
      "quantity": 2,
      "unitPrice": 62.49,
      "discountAmount": 0.0,
      "totalAmount": 124.98,
      "currency": "USD"
    }
  ]
}
```

### Behaviour Notes

- Cart line pricing uses the variant price stored in the catalog. Discounts in the request are applied at the order level.
- Totals use your order currency (default `USD`). VNPay expects minor units, so the backend still multiplies by 100 before signing the request.
- An order status history entry and a pending VNPay transaction record are created atomically with the order.
- Cart contents are cleared after a successful checkout.

### VNPay Configuration

Populate the following environment variables (or override in `application.yml`) before initiating payments:

| Property                                 | Env Variable                 | Description                                      |
| ---------------------------------------- | ---------------------------- | ------------------------------------------------ |
| `app.payment.vnpay.version`              | `VNPAY_VERSION`              | VNPay API version (defaults to `2.1.0`).         |
| `app.payment.vnpay.command`              | `VNPAY_COMMAND`              | VNPay command (defaults to `pay`).               |
| `app.payment.vnpay.tmn-code`             | `VNPAY_TMN_CODE`             | Merchant terminal code, provided by VNPay.       |
| `app.payment.vnpay.hash-secret`          | `VNPAY_HASH_SECRET`          | Shared secret for HMAC signature generation.     |
| `app.payment.vnpay.api-url`              | `VNPAY_API_URL`              | Base payment URL (sandbox or production).        |
| `app.payment.vnpay.return-url`           | `VNPAY_RETURN_URL`           | Browser return URL after payment.                |
| `app.payment.vnpay.locale`               | `VNPAY_LOCALE`               | VNPay locale (`vn` or `en`, default `vn`).       |
| `app.payment.vnpay.order-type`           | `VNPAY_ORDER_TYPE`           | VNPay order type code (default `other`).         |
| `app.payment.vnpay.order-info-prefix`    | `VNPAY_ORDER_INFO_PREFIX`    | Prefix for the order description shown in VNPay. |
| `app.payment.vnpay.expire-after-minutes` | `VNPAY_EXPIRE_AFTER_MINUTES` | Lifetime of the payment URL (default `15`).      |

### Error Responses

- `400 Bad Request` — validation failures (empty cart, missing address details, negative amounts, invalid quantities).
- `401 Unauthorized` — missing or invalid JWT.
- `404 Not Found` — referenced address doesn't belong to the user.
- `502 Bad Gateway` — VNPay signature or configuration errors preventing payment URL generation.

## POST `/payments/vnpay/confirm`

Accepts the query parameters returned by VNPay after checkout and updates the order/payment status. The payload should include all `vnp_*` fields that VNPay appended to the return URL.

```json
{
  "vnp_Amount": "475717300",
  "vnp_BankCode": "NCB",
  "vnp_TransactionNo": "15205230",
  "vnp_ResponseCode": "00",
  "vnp_TransactionStatus": "00",
  "vnp_TxnRef": "ORD-00010033",
  "vnp_SecureHash": "<signature>"
}
```

### Behaviour

- Validates the HMAC signature with your configured `vnpay.hash-secret`.
- Looks up the order/payment transaction by `vnp_TxnRef` (order number).
- If `ResponseCode` and `TransactionStatus` are `00`, the payment is marked `CAPTURED`, the order moves to `PROCESSING`, and the history table records the transition.
- Otherwise the transaction is marked `FAILED` and the order is cancelled.
- Replaying the same payload is idempotent; the endpoint simply returns the existing state.

### Response

```json
{
  "orderNumber": "ORD-00010033",
  "orderStatus": "PROCESSING",
  "paymentStatus": "CAPTURED",
  "transactionStatus": "CAPTURED",
  "alreadyProcessed": false
}
```

## GET `/purchased-items`

Returns a paginated list of items the authenticated user has purchased (orders whose payment status is `CAPTURED`). Results are sorted by the most recent payment, falling back to the order item creation time.

### Query Parameters

Supports the usual Spring pageable parameters:

- `page` — zero-based page index (default `0`).
- `size` — page size (default `20`).
- `sort` — optional sort expression if you need to override the default ordering.

Example request:

```
GET http://localhost:8080/api/orders/purchased-items?page=0&size=10
Authorization: Bearer <token>
```

### Response

```
Status: 200 OK
Content-Type: application/json
```

```json
{
  "content": [
    {
      "orderId": "6e9c1fd7-4243-4a7a-9e3d-1d49f21b8c44",
      "orderNumber": "ORD-00010234",
      "orderStatus": "PROCESSING",
      "paymentStatus": "CAPTURED",
      "orderItemId": "41a4e557-1f7d-4fd6-9a11-5b0b8bb7d3e6",
      "productId": "d53c16a4-beb5-4a97-b992-ef7fb8cfe5b8",
      "productName": "Everyday Crewneck",
      "variantId": "4a23ab92-8c62-4e80-81d8-6a06fb4048a4",
      "quantity": 2,
      "unitPrice": 62.49,
      "totalAmount": 124.98,
      "currency": "USD",
      "purchasedAt": "2025-03-12T09:15:11.102Z"
    }
  ],
  "totalElements": 4,
  "totalPages": 1,
  "page": 0,
  "size": 10,
  "hasNext": false,
  "hasPrevious": false
}
```

### Error Responses

- `401 Unauthorized` — missing or invalid JWT.
- `404 Not Found` — never returned; an empty list is encoded as an empty `content` array.

## GET `/`

Fetches the authenticated user's orders (newest first) with summary details and the order items for each purchase.

### Query Parameters

Supports the standard pageable parameters (`page`, `size`, optional `sort`). By default, results are sorted by `placedAt` descending.

### Response

```
Status: 200 OK
Content-Type: application/json
```

```json
{
  "content": [
    {
      "orderId": "6e9c1fd7-4243-4a7a-9e3d-1d49f21b8c44",
      "orderNumber": "ORD-00010234",
      "orderStatus": "PROCESSING",
      "paymentStatus": "CAPTURED",
      "subtotalAmount": 124.98,
      "discountAmount": 5.0,
      "shippingAmount": 2.5,
      "taxAmount": 0.0,
      "totalAmount": 122.48,
      "currency": "USD",
      "shippingMethod": "standard",
      "shippingTrackingNumber": "TRACK-123456",
      "placedAt": "2025-03-12T09:10:02.581Z",
      "paidAt": "2025-03-12T09:12:11.004Z",
      "fulfilledAt": null,
      "items": [
        {
          "orderItemId": "41a4e557-1f7d-4fd6-9a11-5b0b8bb7d3e6",
          "productId": "d53c16a4-beb5-4a97-b992-ef7fb8cfe5b8",
          "productName": "Everyday Crewneck",
          "variantId": "4a23ab92-8c62-4e80-81d8-6a06fb4048a4",
          "quantity": 2,
          "unitPrice": 62.49,
          "totalAmount": 124.98,
          "currency": "USD"
        }
      ]
    }
  ],
  "totalElements": 4,
  "totalPages": 1,
  "page": 0,
  "size": 20,
  "hasNext": false,
  "hasPrevious": false
}
```

### Error Responses

- `401 Unauthorized` — missing or invalid JWT.

## GET `/purchased-items/{productId}/latest`

Looks up the most recent captured order item for the authenticated user and the specified product.

```
GET /api/orders/purchased-items/9c8eeb67-9d68-4a70-9e7c-4dc47b7a6da4/latest
Authorization: Bearer <token>
```

```
Status: 200 OK
Content-Type: application/json
```

```json
{
  "orderItemId": "41a4e557-1f7d-4fd6-9a11-5b0b8bb7d3e6",
  "orderId": "6e9c1fd7-4243-4a7a-9e3d-1d49f21b8c44",
  "orderNumber": "ORD-00010234",
  "purchasedAt": "2025-03-12T09:15:11.102Z",
  "verifiedPurchase": true
}
```

If the user has not purchased the product, the endpoint returns `404 Not Found`. Use this endpoint from the review form to decide whether the UI should pre-fill the review `orderItemId` and show a “Verified purchase” indicator.

## POST `/orders/{orderId}/confirm-fulfillment`

Allows the authenticated customer to acknowledge delivery of an order. When invoked the order status transitions to `FULFILLED`, `fulfilledAt` is timestamped, and a status-history entry is recorded. The endpoint is idempotent: confirming an already fulfilled order returns the current state without error.

### Response

```
Status: 200 OK
Content-Type: application/json
```

```json
{
  "orderId": "6e9c1fd7-4243-4a7a-9e3d-1d49f21b8c44",
  "orderNumber": "ORD-00010234",
  "orderStatus": "FULFILLED",
  "paymentStatus": "CAPTURED",
  "paidAt": "2025-03-12T09:10:02.581Z",
  "fulfilledAt": "2025-03-14T18:21:45.903Z"
}
```

### Error Responses

- `401 Unauthorized` — missing or invalid JWT.
- `404 Not Found` — the order does not belong to the authenticated user.
- `409 Conflict` — the order is in a state that cannot be confirmed (e.g., payment not captured, already cancelled).
