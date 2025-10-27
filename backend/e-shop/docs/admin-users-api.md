# Admin Users API

Administrative endpoints for managing customer and staff accounts. All routes require an authenticated admin token and are prefixed with `/api/admin/users`.

## List Users

`GET /api/admin/users`

Query parameters:

- `enabled` — filter by account status (`true`/`false`).
- `role` — filter by role name (e.g., `ADMIN`, `CUSTOMER`).
- `search` — case-insensitive search against email, first name, or last name.
- Standard pageable parameters (`page`, `size`, `sort`). Defaults to 20 per page.

**Response**

`PageResponse<AdminUserSummaryResponse>` containing ID, email, names, enabled flag, timestamps, and role names.

## Get User Detail

`GET /api/admin/users/{userId}`

Returns `AdminUserDetailResponse` with profile information, assigned roles, email verification timestamp, and saved addresses.

## Update User Status

`PATCH /api/admin/users/{userId}/status`

```json
{
  "enabled": false
}
```

Disables or re-enables an account. A disabled user can no longer authenticate.

## Update User Roles

`PUT /api/admin/users/{userId}/roles`

```json
{
  "roles": ["ADMIN", "CUSTOMER"]
}
```

Replaces the user’s role assignments with the provided list. All role names must exist; otherwise the request fails with `404 Not Found`.

## Error Handling

- `401 Unauthorized` — missing/invalid admin token.
- `403 Forbidden` — caller lacks the `ADMIN` role.
- `404 Not Found` — user or role not found.
