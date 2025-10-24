# Product Reviews API

Base URL: `/api/catalog/products/{productId}/reviews`

All endpoints return reviews ordered by `createdAt` (newest first). Creating reviews requires an authenticated user; listing reviews is public.

## List Reviews

`GET /`

Query Parameters (standard Spring pageable):

- `page` — zero-based page index (default `0`).
- `size` — page size (default `10`).
- `sort` — sort directive (defaults to `createdAt,desc`).

```
Status: 200 OK
Content-Type: application/json
```

```json
{
  "content": [
    {
      "id": "87f6989c-a575-4fb7-920b-7a58c0e3dd1e",
      "productId": "9c8eeb67-9d68-4a70-9e7c-4dc47b7a6da4",
      "userId": "b5b26816-1a03-4b52-aeb2-5e8b7099d631",
      "reviewerName": "Alex Doe",
      "rating": 5,
      "reviewText": "Fantastic quality and fast shipping.",
      "verifiedPurchase": true,
      "createdAt": "2025-03-12T09:41:17.203Z",
      "updatedAt": "2025-03-12T09:41:17.203Z"
    }
  ],
  "totalElements": 1,
  "totalPages": 1,
  "page": 0,
  "size": 10,
  "hasNext": false,
  "hasPrevious": false
}
```

## Create Review

`POST /`

```
Status: 201 Created
Content-Type: application/json
Authentication: Required
```

Request body:

```json
{
  "rating": 4,
  "reviewText": "Solid everyday tee. Fits true to size.",
  "orderItemId": "0d0258b5-b3f2-4fcb-b0fe-542244804445"
}
```

- `rating` — required integer between 1 and 5.
- `reviewText` — required, trimmed text (max 2000 chars).
- `orderItemId` — optional; when supplied, it must belong to the authenticated user and reference the same product. Reviews tied to fully captured orders are flagged as `verifiedPurchase`.

Success response mirrors the list payload for a single review.

```json
{
  "id": "4fad7f83-6c4e-4bb9-8acb-d976f30bfab5",
  "productId": "9c8eeb67-9d68-4a70-9e7c-4dc47b7a6da4",
  "userId": "b5b26816-1a03-4b52-aeb2-5e8b7099d631",
  "reviewerName": "Alex Doe",
  "rating": 4,
  "reviewText": "Solid everyday tee. Fits true to size.",
  "verifiedPurchase": true,
  "createdAt": "2025-03-12T10:15:03.125Z",
  "updatedAt": "2025-03-12T10:15:03.125Z"
}
```

## Error Responses

- `400 Bad Request` — Invalid payload, rating outside 1-5, malformed UUID, or mismatched `orderItemId`.
- `401 Unauthorized` — Missing or invalid authentication when creating reviews.
- `404 Not Found` — Product does not exist.
- `409 Conflict` — Authenticated user has already submitted a review for the product.

Use the standard pageable query parameters (`page`, `size`, `sort`) to paginate or re-sort review listings.

