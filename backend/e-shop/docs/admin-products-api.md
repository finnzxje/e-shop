# Admin Products API

Administrative endpoints for managing catalog products. All routes are prefixed with `/api/admin/catalog/products` and require an authenticated user with the `ADMIN` role.

## List Products

`GET /api/admin/catalog/products`

Returns a paginated list of products with optional filtering.

**Query Parameters**

- `status` — filter by `DRAFT`, `ACTIVE`, or `ARCHIVED`.
- `featured` — `true`/`false` to filter featured products.
- `gender` — one of the configured gender enums.
- `categoryId` — integer ID of a category (matches the catalog schema).
- `search` — case-insensitive search across name, slug, and description.
- `updatedAfter` / `updatedBefore` — ISO-8601 timestamps limiting by `updatedAt`.
- Standard Spring `page`, `size`, and `sort` parameters are supported. The default sort is `updatedAt,desc`.

**Response**

Returns `PageResponse<ProductSummaryResponse>` as used by the public catalog endpoints.

## Fetch Product Details

`GET /api/admin/catalog/products/{productId}`

Retrieves the full product payload (`ProductResponse`) including category, tags, variants, and images.

## Create Product

`POST /api/admin/catalog/products`

Creates a new product. Variants and media management will be handled in follow-up endpoints; this request focuses on the core product metadata.

**Request Body**

```json
{
  "name": "Everyday Crew Tee",
  "slug": "everyday-crew-tee",
  "description": "Super soft organic cotton tee.",
  "basePrice": 32.0,
  "categoryId": 12,
  "status": "draft",
  "featured": false,
  "gender": "unisex",
  "productType": "tops",
  "taxonomyPath": ["tops", "tees"],
  "tags": ["essentials", "organic"]
}
```

**Responses**

- `201 Created` with `ProductResponse` on success.
- `409 Conflict` when the slug already exists.
- `404 Not Found` if the referenced category is missing.

## Update Product

`PUT /api/admin/catalog/products/{productId}`

Replaces the editable product fields (same schema as create). The slug can be updated; conflicts are rejected with `409`.

**Response**

- `200 OK` with the updated `ProductResponse`.

## Update Product Status

`PATCH /api/admin/catalog/products/{productId}/status`

Updates the lifecycle status without affecting the rest of the product payload.

**Request Body**

```json
{
  "status": "active"
}
```

**Response**

- `200 OK` with the updated `ProductResponse`.

## Media Uploads

MinIO runs alongside the stack (see `docker-compose.yml`) and is exposed at `http://localhost:9000`. Use the console on port `9090` to inspect uploaded objects. On startup the API ensures the `products` bucket exists and applies a public-read policy, so returned URLs (`http://localhost:9000/products/...`) are immediately browser-accessible in development environments.

### Upload Product Image

`POST /api/admin/catalog/products/{productId}/images`

Consumes `multipart/form-data` with the following fields:

- `file` (required) — image file to upload.
- `altText` (optional) — up to 512 characters.
- `displayOrder` (optional integer) — ordering hint; defaults to `0`.
- `primary` (optional boolean) — mark the image as the primary asset.
- `colorId` (optional integer) — associate the image with an existing color.

**Responses**

- `201 Created` — returns `ProductImageResponse` with the persisted metadata and resolved URL.
- `400 Bad Request` — file missing or invalid.
- `404 Not Found` — unknown product or color.

## Error Handling

Errors follow the global `ErrorResponse` envelope documented elsewhere. Notable status codes include:

- `401 Unauthorized` — missing/invalid token.
- `403 Forbidden` — authenticated but lacking the `ADMIN` role.
- `404 Not Found` — product or category missing.
- `409 Conflict` — slug duplication.
