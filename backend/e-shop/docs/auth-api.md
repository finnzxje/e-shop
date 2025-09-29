# Authentication API

This document describes the authentication endpoints exposed by the E‑Shop backend. All routes are prefixed with `/api/auth` unless otherwise stated.

## Authentication & Authorization

The service uses stateless JWT bearer tokens. Successful authentication issues a short‑lived access token and a long‑lived refresh token. Include the access token in the `Authorization` header (`Bearer <token>`) when calling protected endpoints such as `/api/auth/test-token`.

### Register

`POST /api/auth/register`

Creates a new customer account and returns the user profile (no tokens are generated on registration).

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

* `201 Created` — returns an `AuthResponse` without tokens:

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

* `409 Conflict` — email already registered.
* `400 Bad Request` — validation failures (field level details included in the response message).

### Login

`POST /api/auth/login`

Authenticates an existing user and returns both tokens alongside the user profile.

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

* `401 Unauthorized` — invalid credentials.
* `400 Bad Request` — malformed JSON body.

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

* `200 OK` — returns the same structure as the login response, with new tokens.
* `401 Unauthorized` — refresh token missing, malformed, expired, or not a refresh token.

### Test Current Token

`GET /api/auth/test-token`

Protected endpoint that echoes the authentication context so clients can verify whether their access token is still valid.

**Headers**

`Authorization: Bearer <access token>`

**Responses**

* `200 OK` — access token is valid:

  ```json
  {
    "authenticated": true,
    "username": "jane.doe@example.com",
    "roles": ["CUSTOMER"]
  }
  ```

* `401 Unauthorized` — missing or invalid token:

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

* `postgres` — Postgres 17 database exposed on host port `5433`.
* `api` — Spring Boot backend exposed on host port `8080`.

Default database credentials:

| Variable | Value |
| --- | --- |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://postgres:5432/eshop` |
| `SPRING_DATASOURCE_USERNAME` | `app` |
| `SPRING_DATASOURCE_PASSWORD` | `secret` |

When running outside Docker, update `application.yml` or supply equivalent environment variables.
