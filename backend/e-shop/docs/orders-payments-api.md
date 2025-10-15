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
  "shippingAmount": 2.50,
  "discountAmount": 5.00,
  "taxAmount": 0.00,
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
  "discountAmount": 5.00,
  "shippingAmount": 2.50,
  "taxAmount": 0.00,
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
      "discountAmount": 0.00,
      "totalAmount": 124.98,
      "currency": "USD"
    }
  ]
}
```

### Behaviour Notes

- Cart line pricing uses the variant price stored in the catalog. Discounts in the request are applied at the order level.
- Totals are stored in USD. VNPay amounts are computed via a static conversion rate of `1 USD = 26,355.53 VND`, then multiplied by 100 in minor units per VNPay's specification.
- An order status history entry and a pending VNPay transaction record are created atomically with the order.
- Cart contents are cleared after a successful checkout.

### VNPay Configuration

Populate the following environment variables (or override in `application.yml`) before initiating payments:

| Property | Env Variable | Description |
| --- | --- | --- |
| `app.payment.vnpay.version` | `VNPAY_VERSION` | VNPay API version (defaults to `2.1.0`). |
| `app.payment.vnpay.command` | `VNPAY_COMMAND` | VNPay command (defaults to `pay`). |
| `app.payment.vnpay.tmn-code` | `VNPAY_TMN_CODE` | Merchant terminal code, provided by VNPay. |
| `app.payment.vnpay.hash-secret` | `VNPAY_HASH_SECRET` | Shared secret for HMAC signature generation. |
| `app.payment.vnpay.api-url` | `VNPAY_API_URL` | Base payment URL (sandbox or production). |
| `app.payment.vnpay.return-url` | `VNPAY_RETURN_URL` | Browser return URL after payment. |
| `app.payment.vnpay.ipn-url` | `VNPAY_IPN_URL` | Server-to-server notification endpoint (optional). |
| `app.payment.vnpay.locale` | `VNPAY_LOCALE` | VNPay locale (`vn` or `en`, default `vn`). |
| `app.payment.vnpay.order-type` | `VNPAY_ORDER_TYPE` | VNPay order type code (default `other`). |
| `app.payment.vnpay.order-info-prefix` | `VNPAY_ORDER_INFO_PREFIX` | Prefix for the order description shown in VNPay. |
| `app.payment.vnpay.expire-after-minutes` | `VNPAY_EXPIRE_AFTER_MINUTES` | Lifetime of the payment URL (default `15`). |

### Error Responses

- `400 Bad Request` — validation failures (empty cart, missing address details, negative amounts, invalid quantities).
- `401 Unauthorized` — missing or invalid JWT.
- `404 Not Found` — referenced address doesn't belong to the user.
- `502 Bad Gateway` — VNPay signature or configuration errors preventing payment URL generation.

Pending integration work: implement VNPay IPN/return callbacks to confirm payment status and update the order accordingly.
