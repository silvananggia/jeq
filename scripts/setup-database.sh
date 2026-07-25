#!/usr/bin/env bash
# Install PostgreSQL di host Ubuntu, buat DB/user, jalankan schema (+ opsional seed).
# Postgres TIDAK dijalankan di Docker — hanya di localhost server.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [[ -f "${SCRIPT_DIR}/deploy.env" ]]; then
  # shellcheck disable=SC1091
  source "${SCRIPT_DIR}/deploy.env"
fi

DB_NAME="${DB_NAME:-jeqdb}"
DB_USER="${DB_USER:-jeqoperator}"
DB_PASSWORD="${DB_PASSWORD:-Jasindo@123}"
DB_PORT="${DB_PORT:-5432}"
WITH_SEED="${WITH_SEED:-true}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Jalankan sebagai root: sudo $0"
  exit 1
fi

if ! grep -qi ubuntu /etc/os-release; then
  echo "Script ini ditujukan untuk Ubuntu."
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "==> Install PostgreSQL"
apt-get update -y
apt-get install -y postgresql postgresql-contrib

systemctl enable --now postgresql

PG_VERSION="$(sudo -u postgres psql -tAc 'SHOW server_version_num' | head -c 2)"
PG_CONF_DIR="/etc/postgresql/${PG_VERSION}/main"
if [[ ! -d "${PG_CONF_DIR}" ]]; then
  # Fallback: deteksi otomatis
  PG_CONF_DIR="$(ls -d /etc/postgresql/*/main 2>/dev/null | sort -V | tail -n1)"
fi

if [[ -z "${PG_CONF_DIR}" || ! -d "${PG_CONF_DIR}" ]]; then
  echo "Tidak menemukan direktori konfigurasi PostgreSQL."
  exit 1
fi

echo "==> Konfigurasi listen (agar container Docker bisa akses host Postgres)"
CONF="${PG_CONF_DIR}/postgresql.conf"
HBA="${PG_CONF_DIR}/pg_hba.conf"

if grep -qE "^#?listen_addresses\s*=" "${CONF}"; then
  sed -i "s/^#\?listen_addresses\s*=.*/listen_addresses = '*'/" "${CONF}"
else
  echo "listen_addresses = '*'" >> "${CONF}"
fi

# Docker bridge + localhost
for line in \
  "host    ${DB_NAME}    ${DB_USER}    127.0.0.1/32    scram-sha-256" \
  "host    ${DB_NAME}    ${DB_USER}    ::1/128         scram-sha-256" \
  "host    ${DB_NAME}    ${DB_USER}    172.16.0.0/12   scram-sha-256"; do
  if ! grep -Fq "$line" "${HBA}"; then
    echo "$line" >> "${HBA}"
  fi
done

systemctl restart postgresql

echo "==> Buat role & database (idempotent)"
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASSWORD}';
  ELSE
    ALTER ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASSWORD}';
  END IF;
END
\$\$;

SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\gexec

GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
SQL

# Schema privileges untuk schema public (PG 15+)
sudo -u postgres psql -v ON_ERROR_STOP=1 -d "${DB_NAME}" <<SQL
GRANT ALL ON SCHEMA public TO ${DB_USER};
ALTER SCHEMA public OWNER TO ${DB_USER};
SQL

SCHEMA_FILE="${ROOT_DIR}/db.sql"
SEED_FILE="${ROOT_DIR}/seed.sql"

if [[ ! -f "${SCHEMA_FILE}" ]]; then
  echo "File schema tidak ditemukan: ${SCHEMA_FILE}"
  exit 1
fi

TABLE_EXISTS="$(
  PGPASSWORD="${DB_PASSWORD}" psql -h 127.0.0.1 -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
    -tAc "SELECT to_regclass('public.users') IS NOT NULL"
)"

if [[ "${TABLE_EXISTS}" == "t" ]]; then
  echo "==> Schema sudah ada, skip db.sql"
else
  echo "==> Apply schema (db.sql)"
  PGPASSWORD="${DB_PASSWORD}" psql -h 127.0.0.1 -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
    -v ON_ERROR_STOP=1 -f "${SCHEMA_FILE}"
fi

if [[ "${WITH_SEED}" == "true" ]]; then
  if [[ -f "${SEED_FILE}" ]]; then
    echo "==> Apply seed (seed.sql)"
    PGPASSWORD="${DB_PASSWORD}" psql -h 127.0.0.1 -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
      -v ON_ERROR_STOP=1 -f "${SEED_FILE}"
  else
    echo "Seed file tidak ada, dilewati."
  fi
fi

echo
echo "Database siap:"
echo "  host=127.0.0.1 port=${DB_PORT} db=${DB_NAME} user=${DB_USER}"
echo "  Dari Docker: host.docker.internal:${DB_PORT}"
