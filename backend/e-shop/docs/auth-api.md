# Authentication API

This document describes the authentication endpoints exposed by the E‑Shop backend. All routes are prefixed with `/api/auth` unless otherwise stated.

## Authentication & Authorization

The service uses stateless JWT bearer tokens. Successful authentication issues a short‑lived access token and a long‑lived refresh token. Include the access token in the `Authorization` header (`Bearer <token>`) when calling protected endpoints such as `/api/auth/test-token`.

### Register

`POST /api/auth/register`

Creates a new customer account, leaves it disabled, and triggers an activation email. No tokens are generated until the address is confirmed.

**Request body**

```json
{
  "email": "jane.doe@example.com",
  "password": "secret123",
  "firstName": "Jane",
  "lastName": "Doe"
}
```

**Responses**

- `201 Created` — returns an `AuthResponse` without tokens:

  ```json
  {
    "id": "fdc1b8cb-6e78-4c12-8ceb-8bbd1ce41f3f",
    "email": "jane.doe@example.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "enabled": false,
    "createdAt": "2025-02-18T12:44:10.941Z",
    "token": null,
    "refreshToken": null,
    "roles": ["CUSTOMER"]
  }
  ```

- `409 Conflict` — email already registered.
- `400 Bad Request` — validation failures (field level details included in the response message).

### Login

`POST /api/auth/login`

Authenticates an existing (and activated) user and returns both tokens alongside the user profile. Accounts that have not been activated will fail authentication with a dedicated error.

**Request body**

```json
{
  "email": "jane.doe@example.com",
  "password": "secret123"
}
```

**Successful response** — `200 OK` with `AuthResponse`:

```json
{
  "id": "fdc1b8cb-6e78-4c12-8ceb-8bbd1ce41f3f",
  "email": "jane.doe@example.com",
  "firstName": "Jane",
  "lastName": "Doe",
  "enabled": true,
  "createdAt": "2025-02-18T12:44:10.941Z",
  "token": "<JWT access token>",
  "refreshToken": "<JWT refresh token>",
  "roles": ["CUSTOMER"]
}
```

**Error responses**

- `403 Forbidden` — account exists but is not activated yet.
- `401 Unauthorized` — email/password combination is invalid.
- `400 Bad Request` — malformed JSON body.

### Refresh Tokens

`POST /api/auth/refresh`

Accepts a refresh token and returns a brand new access/refresh token pair. The old refresh token should be discarded.

**Request body**

```json
{
  "refreshToken": "<JWT refresh token>"
}
```

**Responses**

- `200 OK` — returns the same structure as the login response, with new tokens.
- `401 Unauthorized` — refresh token missing, malformed, expired, or not a refresh token.

### Get Current User Profile

`GET /api/auth/me`

Returns the authenticated user's profile without issuing new tokens. Use this to hydrate client-side sessions after a page reload.

**Headers**

`Authorization: Bearer <access token>`

**Responses**

- `200 OK` — returns `AuthResponse` without tokens:

  ```json
  {
    "id": "fdc1b8cb-6e78-4c12-8ceb-8bbd1ce41f3f",
    "email": "jane.doe@example.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "enabled": true,
    "createdAt": "2025-02-18T12:44:10.941Z",
    "token": null,
    "refreshToken": null,
    "roles": ["CUSTOMER"]
  }
  ```

- `401 Unauthorized` — missing or invalid access token.

### Activate Account

`GET /api/auth/activate?token=<token>`

Confirms the activation token sent to the user's email address. Clients should call this endpoint after a user follows the link from their inbox.

**Successful response** — `200 OK`:

```json
{
  "activated": true,
  "message": "Account activated successfully."
}
```

**Error responses**

- `400 Bad Request` — token missing, already used, or expired. Resend the activation email in this case.

### Resend Activation Email

`POST /api/auth/activate/resend`

Requests a fresh activation token for a user who registered but has not confirmed their address yet.

**Request body**

```json
{
  "email": "jane.doe@example.com"
}
```

**Responses**

- `200 OK` — confirmation email queued again:

  ```json
  {
    "activated": false,
    "message": "Activation email sent."
  }
  ```
- `404 Not Found` — no account exists for the provided email.
- `409 Conflict` — the account is already activated.

### Request Password Reset

`POST /api/auth/password/reset/request`

Initiates the password reset flow. The backend always responds with `202 Accepted`, regardless of whether the email exists, to avoid leaking account information.

**Request body**

```json
{
  "email": "jane.doe@example.com"
}
```

**Response** — `202 Accepted`

### Confirm Password Reset

`POST /api/auth/password/reset/confirm`

Completes the password reset using the 4-digit token that was emailed to the user.

**Request body**

```json
{
  "email": "jane.doe@example.com",
  "token": "8341",
  "newPassword": "new-secret",
  "confirmPassword": "new-secret"
}
```

**Response** — `204 No Content`

**Error responses**

- `400 Bad Request` — token invalid, expired, already used, or password validation failed.

**Notes**

- Tokens expire after `app.auth.password-reset.token-expiration-minutes` (15 minutes by default). Requesting a new token invalidates any previous ones.

### Test Current Token

`GET /api/auth/test-token`

Protected endpoint that echoes the authentication context so clients can verify whether their access token is still valid.

**Headers**

`Authorization: Bearer <access token>`

**Responses**

- `200 OK` — access token is valid:

  ```json
  {
    "authenticated": true,
    "username": "jane.doe@example.com",
    "roles": ["CUSTOMER"]
  }
  ```

- `401 Unauthorized` — missing or invalid token:

  ```json
  {
    "authenticated": false,
    "username": null,
    "roles": []
  }
  ```

## Error Envelope

Errors are returned using the `ErrorResponse` schema:

```json
{
  "status": 401,
  "error": "Unauthorized",
  "message": "Access token has expired",
  "timestamp": "2025-02-18T12:59:13.512Z",
  "path": "/api/auth/refresh"
}
```

## Running Locally with Docker Compose

```bash
docker compose build
docker compose up
```

Services:

- `postgres` — Postgres 17 database exposed on host port `5433`.
- `api` — Spring Boot backend exposed on host port `8080`.

Default database credentials:

| Variable                     | Value                                   |
| ---------------------------- | --------------------------------------- |
| `SPRING_DATASOURCE_URL`      | `jdbc:postgresql://postgres:5432/eshop` |
| `SPRING_DATASOURCE_USERNAME` | `app`                                   |
| `SPRING_DATASOURCE_PASSWORD` | `secret`                                |

When running outside Docker, update `application.yml` or supply equivalent environment variables.

## Default Accounts

The application seeds an administrator during startup for development and manual testing:

- Email: `admin@gmail.com`
- Password: `123456`

Use this account to exercise the admin-only endpoints.

## Client Integration Notes

- **Activation link routing** — activation emails point to the frontend at `http://localhost:5173/auth/activate?token=<token>` (configurable via `APP_ACTIVATION_BASE_URL`). The frontend route should read the `token` query param and call `GET /api/auth/activate?token=<token>` against the backend.
- **Resend flow** — surface a “Resend activation email” action that calls `POST /api/auth/activate/resend` with the user's email. Handle `404` (unknown email) and `409` (already activated) with helpful messaging.
- **Post-activation UX** — after a `200` response with `activated: true`, direct the user to the login page. If the backend returns `400`, surface the message and offer a “Resend activation email” option.
- **Disabled accounts** — until activation succeeds, `/api/auth/login` responds with `403` and a message directing the user to verify their email. Surface that copy and offer the resend action.
- **Password reset** — build a two-step flow: first call `POST /api/auth/password/reset/request` to send the 4-digit code, then prompt for the code plus new password and call `POST /api/auth/password/reset/confirm`. Always show a generic success message after the request step to avoid account enumeration.
- **Session gating** — hide restricted areas until `/api/auth/me` confirms `enabled: true` for the current session.
