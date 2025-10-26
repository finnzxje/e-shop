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
- `400 Bad Request` — file missing/invalid or color not found.
- `404 Not Found` — unknown product or color.

### List Product Color Media

`GET /api/admin/catalog/products/{productId}/colors`

Returns an array of color-centric aggregates combining variants and images. Entries where `color` is `null` represent assets that are not tied to a specific swatch.

```json
[
  {
    "color": {
      "id": 12,
      "code": "navy",
      "name": "Navy",
      "hex": "#001f3f"
    },
    "images": [ ... ProductImageResponse ... ],
    "variants": [ ... ProductVariantResponse ... ]
  }
]
```

### List All Catalog Colors

`GET /api/admin/catalog/colors`

Returns every color defined in the catalog, sorted alphabetically. Helpful for admin forms that allow selecting from the global palette.

### Update Product Image

`PATCH /api/admin/catalog/products/{productId}/images/{imageId}`

JSON body (fields optional; omit values you don't want to change):

```json
{
  "altText": "Side profile",
  "displayOrder": 2,
  "primary": false,
  "colorId": 12
}
```

- `200 OK` — returns the updated `ProductImageResponse`.
- `404 Not Found` — image/product/color mismatch.

### Delete Product Image

`DELETE /api/admin/catalog/products/{productId}/images/{imageId}`

Removes the image metadata entry.

- `204 No Content` — deleted successfully.
- `404 Not Found` — image or product mismatch.

## Variant Management

### List Variants

`GET /api/admin/catalog/products/{productId}/variants`

Returns every variant for the product as `ProductVariantResponse` entries (color, size, inventory, pricing).

### Create Variants (Bulk by Color)

`POST /api/admin/catalog/products/{productId}/variants`

```json
{
  "colorId": 12,
  "variants": [
    {
      "size": "S",
      "sku": "TEE-NVY-S",
      "price": 29.99,
      "quantity": 10,
      "active": true,
      "currency": "USD"
    },
    {
      "size": "M",
      "sku": "TEE-NVY-M",
      "quantity": 5
    }
  ]
}
```

- `201 Created` — returns the created variants.
- `409 Conflict` — duplicate color/size combination or SKU.

### Update Variant

`PUT /api/admin/catalog/products/{productId}/variants/{variantId}`

Body mirrors the creation payload fields (all optional). Size and color updates enforce the same uniqueness rules as creation.

### Update Variant Status

`PATCH /api/admin/catalog/products/{productId}/variants/{variantId}/status`

```json
{
  "active": false
}
```

Toggles the variant’s active flag.

### Delete Variant

`DELETE /api/admin/catalog/products/{productId}/variants/{variantId}`

Removes the variant when it is not referenced by existing orders. Returns `204 No Content`; responds with `409 Conflict` if the variant is still in use.

### Adjust Variant Stock

`POST /api/admin/catalog/products/{productId}/variants/{variantId}/stock-adjustments`

```json
{
  "newQuantity": 18,
  "reason": "Manual cycle count",
  "notes": "Added returned items back to shelf"
}
```

Creates a manual stock adjustment, updates the variant quantity, and records the change (including the authenticated user).

### List Variant Stock Adjustments

`GET /api/admin/catalog/products/{productId}/variants/{variantId}/stock-adjustments`

Returns a reverse-chronological list of adjustments, each with previous/new quantity, delta, timestamp, and who performed the change.

## Error Handling

Errors follow the global `ErrorResponse` envelope documented elsewhere. Notable status codes include:

- `401 Unauthorized` — missing/invalid token.
- `403 Forbidden` — authenticated but lacking the `ADMIN` role.
- `404 Not Found` — product or category missing.
- `409 Conflict` — slug duplication.
