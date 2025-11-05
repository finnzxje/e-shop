#!/usr/bin/env bash
set -euo pipefail

# Cleans the catalog tables and loads the Patagonia demo dataset.
# Configure the target database with $DATABASE_URL (defaults to local docker-compose DB).

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_URL="${DATABASE_URL:-postgres://app:secret@localhost:5433/eshop}"
CLEAN_SQL="$ROOT_DIR/backend/e-shop/target/classes/db/clean_catalog.sql"
SEED_DIR="$ROOT_DIR/backend/e-shop/src/main/resources/data"
SEED_FILE="$SEED_DIR/patagonia_seed_2025-10-05.sql"
SEED_URL="https://github.com/finnzxje/e-shop/releases/download/seed-2025-10-05/patagonia_seed_2025-10-05.sql"

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required but not found in PATH." >&2
  exit 1
fi

if [ ! -f "$CLEAN_SQL" ]; then
  cat >&2 <<EOF
Missing $CLEAN_SQL
Make sure the backend has been built at least once (./mvnw package) so Flyway resources are copied to target/.
EOF
  exit 1
fi

mkdir -p "$SEED_DIR"

if [ ! -f "$SEED_FILE" ]; then
  echo "Downloading Patagonia seed..."
  curl -L "$SEED_URL" -o "$SEED_FILE"
else
  echo "Using existing seed at $SEED_FILE"
fi

echo "Cleaning catalog tables..."
psql "$DB_URL" -f "$CLEAN_SQL"

echo "Loading Patagonia seed..."
psql "$DB_URL" -f "$SEED_FILE"

echo "Done."
