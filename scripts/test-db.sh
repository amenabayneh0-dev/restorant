#!/usr/bin/env bash
# Runs the SQL migrations + tests in a throwaway database on a local PostgreSQL.
# Usage: PGHOST=localhost PGUSER=postgres npm run test:db
set -euo pipefail
cd "$(dirname "$0")/.."
DB="menuflow_test_$$"
P="psql -X -q -v ON_ERROR_STOP=1"
createdb "$DB"; trap 'dropdb --if-exists "$DB"' EXIT
export PGDATABASE="$DB"
$P -f supabase/tests/stubs.sql
$P -f supabase/migrations/0001_schema.sql
$P -f supabase/migrations/0002_hardening.sql
$P -f supabase/seed.sql
$P -f supabase/seed.sql   # seed must be safe to re-run
$P -f supabase/tests/order_flow.sql
