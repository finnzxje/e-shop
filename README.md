# e-shop

## Development

Run the API with its development database:

```
docker compose up --build
```

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
