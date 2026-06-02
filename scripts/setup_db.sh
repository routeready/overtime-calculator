#!/bin/bash
# Bootstrap the PostgreSQL database in OrbStack.
# Run once on the Mac Mini before first launch.

set -e

echo "==> Setting up Mining Bible database..."

# Create DB and user (adjust if using a different postgres setup)
psql postgres <<'SQL'
CREATE USER miningbible WITH PASSWORD 'password';
CREATE DATABASE miningbible OWNER miningbible;
GRANT ALL PRIVILEGES ON DATABASE miningbible TO miningbible;
SQL

# Enable pgvector in the new database
psql miningbible <<'SQL'
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
SQL

echo "==> Database ready."
echo "==> Running Alembic migrations..."

cd "$(dirname "$0")/.."
python -m alembic upgrade head

echo "==> Done. Create the first admin user with:"
echo "    python scripts/create_admin.py --email YOUR_EMAIL --password YOUR_PASSWORD"
