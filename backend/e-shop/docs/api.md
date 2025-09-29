# Catalog API

Base URL: `/api/catalog`

## Products

### GET `/products`

Returns a paginated list of catalog products. Results are ordered by `createdAt` descending by default and can be customized with Spring's standard pageable query parameters.

#### Query Parameters

- `page` — zero-based page index (default `0`).
- `size` — page size (default `20`).
- `sort` — property to sort by, optionally suffixed with direction (e.g. `sort=createdAt,desc`). Multiple values allowed.

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
