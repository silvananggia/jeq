#!/usr/bin/env bash
# Deploy backend + frontend via Docker Compose (Postgres tetap di host).
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
BACKEND_PORT="${BACKEND_PORT:-4000}"
FRONTEND_PORT="${FRONTEND_PORT:-8080}"
USGS_SYNC_INTERVAL_MS="${USGS_SYNC_INTERVAL_MS:-900000}"

urlencode() {
  # Encode password untuk DATABASE_URL
  python3 -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$1"
}

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker belum terpasang. Jalankan dulu: sudo ${SCRIPT_DIR}/install-docker.sh"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose plugin belum tersedia."
  exit 1
fi

cd "${ROOT_DIR}"

ENCODED_PASSWORD="$(urlencode "${DB_PASSWORD}")"
ENV_FILE="${ROOT_DIR}/backend/.env"

echo "==> Tulis ${ENV_FILE}"
cat > "${ENV_FILE}" <<EOF
PORT=4000
DATABASE_URL=postgresql://${DB_USER}:${ENCODED_PASSWORD}@host.docker.internal:${DB_PORT}/${DB_NAME}
USGS_SYNC_INTERVAL_MS=${USGS_SYNC_INTERVAL_MS}
EOF

# Port mapping compose (opsional via root .env)
cat > "${ROOT_DIR}/.env" <<EOF
BACKEND_PORT=${BACKEND_PORT}
FRONTEND_PORT=${FRONTEND_PORT}
EOF

echo "==> Build & start containers"
docker compose up -d --build

echo "==> Status"
docker compose ps

echo
echo "Deploy selesai:"
echo "  Frontend  http://$(hostname -I 2>/dev/null | awk '{print $1}'):${FRONTEND_PORT}"
echo "  Backend   http://$(hostname -I 2>/dev/null | awk '{print $1}'):${BACKEND_PORT}"
echo
echo "Log: docker compose -f ${ROOT_DIR}/docker-compose.yml logs -f"
