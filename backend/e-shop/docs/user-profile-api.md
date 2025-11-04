# User Profile API

Base URL: `/api/account/profile`

All endpoints require an authenticated request (`Authorization: Bearer <token>`). Operations target the signed-in user; attempting to act on another account is not permitted.

## Get Profile

`GET /`

Returns the profile details for the authenticated user.

### Response

```
Status: 200 OK
Content-Type: application/json
```

```json
{
  "id": "fdc1b8cb-6e78-4c12-8ceb-8bbd1ce41f3f",
  "email": "jane.doe@example.com",
  "firstName": "Jane",
  "lastName": "Doe",
  "phone": "+1 555 000 1234",
  "enabled": true,
  "emailVerifiedAt": "2025-03-18T12:10:45.194Z",
  "createdAt": "2025-02-18T12:44:10.941Z",
  "updatedAt": "2025-03-20T09:02:11.201Z"
}
```

## Update Profile

`PUT /`

Updates the first name, last name, and phone number for the authenticated user.

### Request Body

```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "phone": "+1 555 000 1234"
}
```

### Response

```
Status: 200 OK
Content-Type: application/json
```

Returns the updated profile payload.

## Validation Rules

- `firstName` is required and must be 80 characters or fewer.
- `lastName` is required and must be 80 characters or fewer.
- `phone` is optional but must be 30 characters or fewer when provided.

## Error Responses

- `400 Bad Request` — validation failed; the response body includes the validation message.
- `401 Unauthorized` — missing or invalid access token.
- `404 Not Found` — returned only if the authenticated user record no longer exists.
