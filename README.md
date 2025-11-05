# e-shop

Full-stack reference implementation of an e-commerce platform. It includes a Spring Boot API, public storefront and admin dashboards written in React, PostgreSQL + pgvector for persistence, MinIO for object storage, and a Python ETL pipeline for recommendation features.

## Repository layout

- `backend/e-shop/` — Spring Boot 3.5 service (Java 21, Maven, Flyway, JWT security, MinIO client, SpringDoc).
- `client/` — customer-facing React 19 + Vite + Tailwind application.
- `admin/` — staff/admin React 19 + Vite dashboard.
- `recomender/` — Python ETL utilities for analytics and recommendation experiments.
- `db/` — database assets (e.g., initialization scripts).
- `backend/e-shop/src/main/resources/db/migration/` — Flyway migrations.
- `backend/e-shop/src/main/resources/data/` — runtime data assets (Patagonia seed download lives here).
- `scripts/` — helper scripts (e.g., Patagonia catalog seeding).
- `docker-compose*.yml` — local orchestration for development (`docker-compose.yml`) and isolated test database (`docker-compose.test.yml`).

## Prerequisites

- Java 21+
- Maven 3.9+
- Node.js 20+ and npm (or pnpm) for the React apps
- Python 3.11+ for the recommender utilities
- Docker Desktop (compose v2) for the default local stack

## Quick start (Docker)

```bash
docker compose up --build
```

The compose stack provisions the following services:

- PostgreSQL 17 + pgvector on `localhost:5433` (user `app`, password `secret`, database `eshop`)
- Spring Boot API on `http://localhost:8080`
- MinIO on `http://localhost:9000` (console `http://localhost:9090`, credentials `admin` / `admin123`)

Shut everything down when finished:

```bash
docker compose down
```

### Environment configuration

Mail delivery (account activation, password reset) requires SMTP credentials. Two setups are supported:

- **Docker Compose / containers** – populate the repository-level `.env` file (already read by Docker Compose) with values such as `SPRING_MAIL_HOST`, `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD`, and `APP_MAIL_FROM`.
- **Running Spring Boot directly** – copy those same variables into `backend/e-shop/.env` (or `.env.properties`). Spring imports this file automatically and exposes the credentials to the mail sender.

## Manual setup

### Backend API

```bash
cd backend/e-shop
cp ../.env .env  # optional: reuse root .env for mail settings
./mvnw spring-boot:run
```

Configuration defaults live in `application.yml`. Override secrets via environment variables or a `.env.properties` file (Spring Boot will auto-load it).

Swagger UI is available at `http://localhost:8080/swagger-ui.html` once the service is running.

### Storefront (`client`)

```bash
cd client
npm install
npm run dev
```

The Vite dev server runs on `http://localhost:5173` and proxies API calls to the backend (`/api/` by default). Adjust environment values using Vite’s standard `.env` files.

### Admin dashboard

```bash
cd admin
npm install
npm run dev
```

The admin UI also runs on Vite (default port `http://localhost:5174` if available). Both front-ends expect the API at `http://localhost:8080`.

### Recommendation ETL

```bash
cd recomender
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python etl/run_etl.py
```

The ETL pipeline pulls interaction data, computes embeddings (CLIP optional), and writes processed datasets to `recomender/etl/data/processed`. Configure connection details via environment variables in `.env` (see `Config` in `etl/config.py` for defaults).

## Backend Docker image

The API image defined in `backend/e-shop/Dockerfile` uses a multi-stage build:

1. Builds the Spring Boot jar with Maven (tests skipped) inside the official Maven + Temurin 21 image.
2. Copies the jar into a lightweight Temurin 21 JRE base image and exposes port 8080.

Build and run it manually if you are not using Compose:

```bash
docker build -t e-shop-api backend/e-shop
docker run --rm -p 8080:8080 \
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://host.docker.internal:5433/eshop \
  -e SPRING_DATASOURCE_USERNAME=app \
  -e SPRING_DATASOURCE_PASSWORD=secret \
  --env-file ./.env \
  e-shop-api
```

The `--env-file` flag reuses mail settings from the project root `.env`. Adjust database connectivity for your environment (e.g., production secrets, cloud Postgres).

## Database and migrations

- Flyway automatically applies migrations from `backend/e-shop/src/main/resources/db/migration` on startup.
- Use the generated schema overview in `backend/e-shop/src/main/resources/db/migration/dbdiagram.md` with tools like dbdiagram.io if you need diagrams.

### Sample data

For deterministic demos the repository ships a helper script that prepares the catalog and loads the Patagonia dataset distributed through GitHub Releases.

```bash
chmod +x scripts/load_patagonia_seed.sh
./scripts/load_patagonia_seed.sh
```

What the script does:

1. Verifies that `backend/e-shop/target/classes/db/clean_catalog.sql` exists (run `./mvnw package` once if it does not).
2. Downloads `patagonia_seed_2025-10-05.sql` from [GitHub Releases](https://github.com/finnzxje/e-shop/releases/tag/seed-2025-10-05) into `backend/e-shop/src/main/resources/data` (skipped when already present).
3. Runs the cleanup SQL to clear catalog tables.
4. Loads the Patagonia seed into the target database (`postgres://app:secret@localhost:5433/eshop` by default). Override the connection with `DATABASE_URL=postgres://... ./scripts/load_patagonia_seed.sh`.

## Testing

Spin up an isolated PostgreSQL instance for integration tests:

```bash
docker compose -f docker-compose.test.yml up -d
```

Run the backend tests:

```bash
cd backend/e-shop
./mvnw test
```

React apps rely on unit/component tests you add (Jest, Vitest, etc.); configure them under each package.

Stop the test database when done:

```bash
docker compose -f docker-compose.test.yml down
```

## Troubleshooting

- Ensure Docker containers have finished applying Flyway migrations before starting the front-ends.
- MinIO requires the bucket configured in `application.yml` (default `products`); create it via the console if not present.
- If you change database ports or credentials, update both Spring Boot properties and any ETL `.env` files.
