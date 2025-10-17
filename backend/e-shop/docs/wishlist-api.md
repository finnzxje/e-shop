# Wishlist API

Base URL: `/api/account/wishlist`

Endpoints require an authenticated user. Each account has an implicit single wishlist containing product entries.

## List Items

`GET /`

Returns the current wishlist items ordered by most recently added first.

```
Status: 200 OK
Content-Type: application/json
```

```json
[
  {
    "id": "b6f167a1-43a0-4d03-8fe8-8a074d981fa0",
    "productId": "ecf6e1a8-38f8-4c9a-9aab-d3165362c654",
    "productName": "Everyday Crewneck",
    "productSlug": "everyday-crewneck",
    "basePrice": 59.99,
    "productActive": true,
    "addedAt": "2025-03-11T08:42:17.201Z"
  }
]
```

## Add Item

`POST /`

Body:

```json
  {
    "productId": "ecf6e1a8-38f8-4c9a-9aab-d3165362c654"
  }
```

- `productId` is required and must reference an existing product.

If the product is already on the wishlist the endpoint simply returns the existing entry with status `201 Created`.

## Remove Item

`DELETE /{productId}`

Removes the product from the wishlist. Returns `204 No Content`. Removing a product that is not on the wishlist results in `404 Not Found`.

## Error Responses

- `400 Bad Request` – Validation failed (missing productId, etc.).
- `401 Unauthorized` – Missing/invalid access token.
- `404 Not Found` – Product not found or not present in the wishlist.

The API is idempotent: calling `POST /` with the same product repeatedly keeps a single wishlist entry.
