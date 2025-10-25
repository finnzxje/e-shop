# e-shop

## Development

Run the API with its development database:

```
docker compose up --build
```

This starts:

- PostgreSQL on `localhost:5433`
- Spring Boot API on `localhost:8080`
- MinIO object storage on `localhost:9000` (console at `http://localhost:9090`)

Default MinIO credentials:

- Access key: `admin`
- Secret key: `admin123`

Stop the stack when you are done:

```
docker compose down
```

## Testing

Start the isolated PostgreSQL instance for integration tests:

```
docker compose -f docker-compose.test.yml up -d
```

Tear it down after tests complete:

```
docker compose -f docker-compose.test.yml down
```
