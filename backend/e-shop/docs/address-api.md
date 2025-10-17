# Address API

Base URL: `/api/account/addresses`

All endpoints require an authenticated request (`Authorization: Bearer <token>`). Responses are scoped to the signed-in user; attempting to access another user's address returns `404 Not Found`.

## List Addresses

`GET /`

Returns every saved address for the authenticated user, ordered by most recently created.

### Response

```
Status: 200 OK
Content-Type: application/json
```

```json
[
  {
    "id": "7c1b6f32-2a5d-4acb-8dbe-7a3b1c1c1d11",
    "label": "Home",
    "recipientName": "Ada Lovelace",
    "phone": "+1 555 123 4567",
    "line1": "123 Innovation Way",
    "line2": "Suite 42",
    "city": "San Francisco",
    "stateProvince": "CA",
    "postalCode": "94107",
    "countryCode": "US",
    "isDefault": true,
    "createdAt": "2025-03-10T10:22:31.192Z",
    "updatedAt": "2025-03-10T10:22:31.192Z"
  }
]
```

## Get Address

`GET /{addressId}`

Retrieves a single address belonging to the authenticated user. Returns `404 Not Found` if the id does not exist for that user.

## Create Address

`POST /`

Creates a new address. Setting `isDefault` to `true` automatically clears the default flag on all other saved addresses for the user.

### Request Body

```json
{
  "label": "Home",
  "recipientName": "Ada Lovelace",
  "phone": "+1 555 123 4567",
  "line1": "123 Innovation Way",
  "line2": "Suite 42",
  "city": "San Francisco",
  "stateProvince": "CA",
  "postalCode": "94107",
  "countryCode": "US",
  "isDefault": true
}
```

### Response

```
Status: 201 Created
Content-Type: application/json
```

Returns the newly created address payload.

## Update Address

`PUT /{addressId}`

Replaces the stored address values. Passing `"isDefault": true` promotes the address to the default for the user; passing `false` removes its default status.

```
Status: 200 OK
Content-Type: application/json
```

## Delete Address

`DELETE /{addressId}`

Removes the address. The endpoint returns `204 No Content` on success. Deleting the current default address leaves the user without a default until another address is marked as such.

## Validation Rules

- `recipientName`, `line1`, `city`, `countryCode` are required.
- `countryCode` must be a two-letter ISO code (e.g., `US`).
- Optional fields (`label`, `line2`, `stateProvince`, `postalCode`, `phone`) accept up to the lengths enforced by the database schema.

## Error Responses

- `400 Bad Request` — validation failed; the response body includes the validation message.
- `401 Unauthorized` — missing or invalid access token.
- `404 Not Found` — the specified address id does not belong to the authenticated user.
