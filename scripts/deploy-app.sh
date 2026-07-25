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
FRONTEND_PORT="${FRONTEND_PORT:-80}"
USGS_SYNC_INTERVAL_MS="${USGS_SYNC_INTERVAL_MS:-900000}"

urlencode() {
  python3 -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$1"
}

public_url() {
  local port="$1"
  local ip
  ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
  if [[ -z "${ip}" ]]; then
    ip="SERVER_IP"
  fi
  if [[ "${port}" == "80" ]]; then
    echo "http://${ip}"
  else
    echo "http://${ip}:${port}"
  fi
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

for f in \
  "${ROOT_DIR}/backend/Dockerfile" \
  "${ROOT_DIR}/backend/package.json" \
  "${ROOT_DIR}/backend/src/index.js" \
  "${ROOT_DIR}/frontend/Dockerfile" \
  "${ROOT_DIR}/frontend/package.json"; do
  if [[ ! -s "$f" ]]; then
    echo "ERROR: file wajib hilang/kosong: $f"
    echo "Pastikan seluruh folder backend/ & frontend/ ikut di-copy/push ke server."
    exit 1
  fi
done

# Buka firewall lokal jika ufw aktif
if command -v ufw >/dev/null 2>&1; then
  if ufw status 2>/dev/null | grep -qi "Status: active"; then
    echo "==> Buka UFW port ${FRONTEND_PORT} dan ${BACKEND_PORT}"
    ufw allow "${FRONTEND_PORT}/tcp" || true
    ufw allow "${BACKEND_PORT}/tcp" || true
  fi
fi

# Cek port host bentrok (selain docker yang akan kita ganti)
if command -v ss >/dev/null 2>&1; then
  if ss -lnt | awk '{print $4}' | grep -qE "[:.]${FRONTEND_PORT}$"; then
    # OK jika sudah dipegang docker-proxy dari stack lama; compose up akan reuse
    echo "==> Port ${FRONTEND_PORT} sudah terpakai — compose akan mencoba bind ulang"
  fi
fi

ENCODED_PASSWORD="$(urlencode "${DB_PASSWORD}")"
ENV_FILE="${ROOT_DIR}/backend/.env"

echo "==> Tulis ${ENV_FILE}"
cat > "${ENV_FILE}" <<EOF
PORT=4000
DATABASE_URL=postgresql://${DB_USER}:${ENCODED_PASSWORD}@host.docker.internal:${DB_PORT}/${DB_NAME}
USGS_SYNC_INTERVAL_MS=${USGS_SYNC_INTERVAL_MS}
EOF

cat > "${ROOT_DIR}/.env" <<EOF
BACKEND_PORT=${BACKEND_PORT}
FRONTEND_PORT=${FRONTEND_PORT}
EOF

echo "==> Build & start containers"
docker compose down --remove-orphans || true
docker compose up -d --build

echo "==> Status"
docker compose ps

# Dengan network_mode: host, port frontend tidak muncul di "PORTS" — cek listen host.
echo "==> Verifikasi listen lokal"
sleep 2
FRONTEND_CHECK_PORT="${FRONTEND_PORT:-80}"
if curl -fsS -o /dev/null -w "frontend HTTP %{http_code}\n" "http://127.0.0.1:${FRONTEND_CHECK_PORT}/" ; then
  echo "Frontend OK di port ${FRONTEND_CHECK_PORT}"
else
  echo "ERROR: Frontend tidak merespons di 127.0.0.1:${FRONTEND_CHECK_PORT}"
  echo "Cek: docker compose logs --tail=80 frontend"
  echo "Pastikan port ${FRONTEND_CHECK_PORT} kosong di host (apache/nginx lain)."
  docker compose logs --tail=40 frontend || true
  exit 1
fi

if curl -fsS -o /dev/null -w "backend HTTP %{http_code}\n" "http://127.0.0.1:${BACKEND_PORT}/api/health" ; then
  echo "Backend OK di port ${BACKEND_PORT}"
else
  echo "WARNING: Backend /api/health gagal — cek DB & logs"
  docker compose logs --tail=40 backend || true
fi

echo
echo "Deploy selesai:"
echo "  Frontend  $(public_url "${FRONTEND_PORT}")"
echo "  Backend   $(public_url "${BACKEND_PORT}")/api/health"
echo
echo "Jika dari internet masih refused:"
echo "  1) Cloud firewall / security group harus allow TCP ${FRONTEND_PORT} (dan ${BACKEND_PORT})"
echo "  2) Di server: sudo ss -lntp | grep -E ':${FRONTEND_PORT}|:${BACKEND_PORT}'"
echo "  3) Log: docker compose -f ${ROOT_DIR}/docker-compose.yml logs -f"
