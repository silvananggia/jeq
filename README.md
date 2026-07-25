# JEQ Platform

Sistem monitoring gempa berbasis sensor Raspberry Pi + data USGS untuk wilayah Indonesia.

## Stack

- **Backend:** Express + PostgreSQL
- **Frontend:** React (Vite) + OpenLayers
- **Sumber gempa:** [USGS Earthquake API](https://earthquake.usgs.gov/fdsnws/event/1/) (bbox Indonesia)

## Deploy di Ubuntu server

Script di `scripts/` (Postgres di **host**, app di Docker):

```bash
cp scripts/deploy.env.example scripts/deploy.env   # sesuaikan DB_USER / password / port
chmod +x scripts/*.sh

# Semua sekaligus
sudo ./scripts/deploy.sh

# Atau terpisah
sudo ./scripts/install-docker.sh
sudo ./scripts/setup-database.sh
./scripts/deploy-app.sh
```

| Service | URL |
|---------|-----|
| Frontend | http://SERVER_IP |
| Backend API | http://SERVER_IP:4000 |

**Arsitektur iframe sensor:** browser → `/device-proxy/IP/PORT/...` → device Tailscale. Socket.IO realtime di-proxy lewat `/socket.io/` (Referer/cookie mengarah ke device yang sama). Tanpa auto-refresh.

Syarat: server dan Raspberry Pi di **tailnet yang sama**, IP di `devices` = IP Tailscale.

Perintah berguna:

```bash
docker compose logs -f          # log semua service
docker compose logs -f backend
docker compose down             # stop
```

## Setup database

PostgreSQL di host/server (bukan di Docker):

```bash
createdb jeq_platform
psql -d jeq_platform -f db.sql
psql -d jeq_platform -f seed.sql   # opsional: user/device demo
```

Untuk `npm run` lokal (tanpa Docker), ganti host ke `localhost`:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/jeq_platform
```

## Jalankan backend

```bash
cd backend
npm install
npm run dev
```

API utama:

| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/api/health` | Cek DB |
| GET | `/api/earthquakes` | List gempa tersimpan |
| POST/GET | `/api/earthquakes/sync` | Tarik data USGS Indonesia |
| GET/POST | `/api/users` | User |
| GET/POST | `/api/devices` | Device Raspberry |
| PATCH | `/api/devices/by-dev/:devId` | Update metadata device |
| GET/POST | `/api/histories` | Riwayat pembacaan sensor |

Contoh kirim data dari Raspberry Pi (parameter sensor disimpan sebagai JSON `data` — field boleh berubah tanpa migrasi DB):

```bash
# Flat fields (otomatis masuk ke kolom data)
curl -X POST http://localhost:4000/api/histories \
  -H 'Content-Type: application/json' \
  -d '{
    "dev_id": "jeq-00001",
    "mmi": 2.3,
    "horiz_pga": 0.015,
    "vert_pga": 0.009,
    "vh_ratio": 0.6,
    "pgv_cm": 0.5,
    "dom_freq": 4.2
  }'

# Atau nested object
curl -X POST http://100.95.74.7:4000/api/histories \
  -H 'Content-Type: application/json' \
  -d '{
    "dev_id": "jeq-00001",
    "data": {
      "mmi": 2.3,
      "horiz_pga": 0.015,
      "vert_pga": 0.009,
      "vh_ratio": 0.6,
      "pgv_cm": 0.5,
      "dom_freq": 4.2
    }
  }'
```

DB yang sudah jalan dengan schema lama bisa dimigrasi:

```bash
psql -d jeq_platform -f migrate_histories_json.sql
```

## Jalankan frontend

```bash
cd frontend
npm install
npm run dev
```

Buka http://localhost:5173 — peta OpenLayers menampilkan gempa USGS (Indonesia) dan lokasi sensor.
