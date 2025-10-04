# Catalog API

Base URL: `/api/catalog`

## Products

### GET `/products`

Returns a paginated list of catalog products. Results are ordered by `createdAt` descending by default and can be customized with Spring's standard pageable query parameters.

#### Query Parameters

- `page` — zero-based page index (default `0`).
- `size` — page size (default `20`).
- `sort` — property to sort by, optionally suffixed with direction (e.g. `sort=createdAt,desc`). Multiple values allowed.

**Example**

```
GET http://localhost:8080/api/catalog/products?sort=createdAt,desc&page=1&size=12
```

#### Response

```
Status: 200 OK
Content-Type: application/json
```

```json
{
  "content": [
    {
      "id": "3f8160d0-9de2-4dee-9ab2-7fa4b030f657",
      "name": "Recycled Cotton Tee",
      "slug": "recycled-cotton-tee",
      "description": "Soft-touch organic cotton tee with relaxed fit.",
      "basePrice": 29.99,
      "status": "active",
      "featured": true,
      "gender": "unisex",
      "productType": "apparel",
      "createdAt": "2025-02-18T09:12:44.280Z",
      "updatedAt": "2025-02-22T18:04:01.921Z",
      "category": {
        "id": 12,
        "name": "Tops",
        "slug": "tops"
      }
    }
  ],
  "totalElements": 42,
  "totalPages": 3,
  "page": 0,
  "size": 20,
  "hasNext": true,
  "hasPrevious": false
}
```

### GET `/products/gender/{gender}`

Returns a paginated list of products filtered by the provided gender segment.

#### Path Parameters

- `gender` — accepted values: `mens`, `womens`, `unisex`, `kids`, `unknown`.

#### Query Parameters

Supports the same pageable parameters as `GET /products`.

**Example**

```
GET http://localhost:8080/api/catalog/products/gender/mens?sort=updatedAt,desc
```

#### Response

```
Status: 200 OK
Content-Type: application/json
```

```json
{
  "content": [],
  "totalElements": 0,
  "totalPages": 0,
  "page": 0,
  "size": 20,
  "hasNext": false,
  "hasPrevious": false
}
```

If an unsupported gender value is provided the API responds with `400 Bad Request`.

### GET `/products/category/{slug}`

Returns a paginated list of products belonging to the specified category and all of its descendant categories.

#### Path Parameters

- `slug` — category slug.

#### Query Parameters

Supports the same pageable parameters as `GET /products`.

**Example**

```
GET http://localhost:8080/api/catalog/products/category/tops?sort=basePrice,asc
```

#### Response

```
Status: 200 OK
Content-Type: application/json
```

```json
{
  "content": [],
  "totalElements": 0,
  "totalPages": 0,
  "page": 0,
  "size": 20,
  "hasNext": false,
  "hasPrevious": false
}
```

If the category slug does not exist the API responds with `404 Not Found`.

### GET `/products/filter`

Filters products by optional gender and/or category slug. When a category is supplied, products in descendant categories are included.

#### Query Parameters

- `gender` — optional; accepted values: `mens`, `womens`, `unisex`, `kids`, `unknown`.
- `category` — optional; category slug. If provided, products in descendant categories are returned.
- Supports the same pageable parameters as `GET /products`.

**Example**

```
GET http://localhost:8080/api/catalog/products/filter?gender=unisex&category=outerwear&sort=name,asc
```

#### Response

```
Status: 200 OK
Content-Type: application/json
```

```json
{
  "content": [],
  "totalElements": 0,
  "totalPages": 0,
  "page": 0,
  "size": 20,
  "hasNext": false,
  "hasPrevious": false
}
```

If an unsupported gender is provided the API responds with `400 Bad Request`. If the category slug does not exist the API responds with `404 Not Found`.

### GET `/products/search`

Searches for products by a free-text query. Matching is performed against the product name, slug, and description.

#### Query Parameters

- `q` — required search term.
- Supports the same pageable parameters as `GET /products`.

**Example**

```
GET http://localhost:8080/api/catalog/products/search?q=denim+jacket&sort=slug,asc
```

#### Response

```
Status: 200 OK
Content-Type: application/json
```

```json
{
  "content": [],
  "totalElements": 0,
  "totalPages": 0,
  "page": 0,
  "size": 20,
  "hasNext": false,
  "hasPrevious": false
}
```

If the search term is blank the API responds with `400 Bad Request`.

### GET `/products/{slug}`

Fetches the full detail for a single product, including tags, variants, and images.

#### Path Parameters

- `slug` — unique product slug.

#### Response

```
Status: 200 OK
Content-Type: application/json
```

```json
{
  "id": "3f8160d0-9de2-4dee-9ab2-7fa4b030f657",
  "name": "Recycled Cotton Tee",
  "slug": "recycled-cotton-tee",
  "description": "Soft-touch organic cotton tee with relaxed fit.",
  "basePrice": 29.99,
  "status": "active",
  "featured": true,
  "gender": "unisex",
  "taxonomyPath": [
    "clothing",
    "tops"
  ],
  "productType": "apparel",
  "createdAt": "2025-02-18T09:12:44.280Z",
  "updatedAt": "2025-02-22T18:04:01.921Z",
  "category": {
    "id": 12,
    "name": "Tops",
    "slug": "tops"
  },
  "tags": [
    {
      "id": 4,
      "tag": "organic"
    }
  ],
  "variants": [
    {
      "id": "4f8f7553-91d5-4f2c-b998-044ef731f968",
      "variantSku": "RCTEE-BLACK-M",
      "price": 29.99,
      "quantityInStock": 32,
      "active": true,
      "size": "M",
      "fit": "regular",
      "currency": "USD",
      "createdAt": "2025-02-18T09:12:44.280Z",
      "color": {
        "id": 5,
        "code": "black",
        "name": "Black",
        "hex": "#000000"
      },
      "attributes": [
        {
          "valueId": 21,
          "value": "cotton",
          "displayValue": "100% Cotton",
          "attributeId": 7,
          "attributeName": "material",
          "attributeType": "text"
        }
      ]
    }
  ],
  "images": [
    {
      "id": "92d03c8a-6dd7-4dc1-a93b-1ad6a49a0ad1",
      "imageUrl": "https://cdn.example.com/products/rctee-front.jpg",
      "altText": "Front view of recycled cotton tee in black",
      "displayOrder": 0,
      "primary": true,
      "createdAt": "2025-02-18T09:12:44.280Z",
      "color": {
        "id": 5,
        "code": "black",
        "name": "Black",
        "hex": "#000000"
      }
    }
  ]
}
```

#### Error Responses

- `404 Not Found` — returned when the product slug does not exist.

---

Use the sample payloads as references. Real responses depend on data present in the catalog.

## Categories

### GET `/categories`

Returns all categories ordered by `displayOrder` then `name`.

```
Status: 200 OK
Content-Type: application/json
```

```json
[
  {
    "id": 3,
    "name": "Apparel",
    "slug": "apparel",
    "displayOrder": 0,
    "active": true,
    "parentCategoryId": null,
    "createdAt": "2025-02-18T09:12:44.280Z"
  }
]
```

### GET `/categories/common`

Returns categories that have exactly one parent (second-level categories). Top-level categories are excluded.

```
Status: 200 OK
Content-Type: application/json
```

```json
[
  {
    "id": 12,
    "name": "Tops",
    "slug": "tops",
    "displayOrder": 10,
    "active": true,
    "parentCategoryId": 3,
    "createdAt": "2025-02-18T09:12:44.280Z"
  }
]
```

### GET `/categories/{slug}`

Fetches a category by slug.

```
Status: 200 OK
Content-Type: application/json
```

```json
{
  "id": 12,
  "name": "Tops",
  "slug": "tops",
  "displayOrder": 10,
  "active": true,
  "parentCategoryId": 3,
  "createdAt": "2025-02-18T09:12:44.280Z"
}
```
