#!/usr/bin/env bash
# Install Docker Engine + Compose plugin on Ubuntu.
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Jalankan sebagai root: sudo $0"
  exit 1
fi

if ! grep -qi ubuntu /etc/os-release; then
  echo "Script ini ditujukan untuk Ubuntu."
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "==> Update apt & prasyarat"
apt-get update -y
apt-get install -y ca-certificates curl gnupg lsb-release

if ! command -v docker >/dev/null 2>&1; then
  echo "==> Tambah repo Docker resmi"
  install -m 0755 -d /etc/apt/keyrings
  if [[ ! -f /etc/apt/keyrings/docker.asc ]]; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
  fi

  arch="$(dpkg --print-architecture)"
  codename="$(. /etc/os-release && echo "$VERSION_CODENAME")"
  echo \
    "deb [arch=${arch} signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${codename} stable" \
    > /etc/apt/sources.list.d/docker.list

  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
else
  echo "==> Docker sudah terpasang: $(docker --version)"
fi

systemctl enable --now docker

# Izinkan user yang memanggil sudo ikut group docker (opsional)
if [[ -n "${SUDO_USER:-}" && "${SUDO_USER}" != "root" ]]; then
  usermod -aG docker "$SUDO_USER"
  echo "==> User '${SUDO_USER}' ditambahkan ke group docker (logout/login agar aktif)"
fi

echo "==> Cek Docker Compose"
docker compose version

echo
echo "Selesai. Docker siap dipakai."
