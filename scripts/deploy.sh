#!/usr/bin/env bash
# Full deploy di Ubuntu server:
#   1) Install Docker
#   2) Setup PostgreSQL di host + schema
#   3) Deploy backend & frontend (Docker Compose)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Jalankan sebagai root: sudo $0"
  exit 1
fi

echo "========================================"
echo " JEQ Platform — full deploy (Ubuntu)"
echo "========================================"
echo

bash "${SCRIPT_DIR}/install-docker.sh"
echo
bash "${SCRIPT_DIR}/setup-database.sh"
echo
# deploy-app tidak wajib root, tapi aman dijalankan sebagai root
bash "${SCRIPT_DIR}/deploy-app.sh"

echo
echo "Semua langkah selesai."
