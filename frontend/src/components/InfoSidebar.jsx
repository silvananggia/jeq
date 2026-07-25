import EarthquakeList from "./EarthquakeList";
import DeviceHistoryList from "./DeviceHistoryList";
import { historyData, historyMmi, mmiColor, mmiLabel } from "../utils/mmi";

function formatDetail(detail) {
  if (!detail) return null;
  if (typeof detail === "string") {
    try {
      return JSON.parse(detail);
    } catch {
      return null;
    }
  }
  return detail;
}

function formatReadingValue(value) {
  if (value == null) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function SensorDetail({ device, latest, historyQuery, onOpenMonitor, onClose }) {
  const detail = formatDetail(device.detail);
  const reading = historyData(latest);
  const mmi = historyMmi(latest);

  return (
    <div className="info-detail">
      <div className="panel-head">
        <h2>Sensor · {device.dev_id}</h2>
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Kembali
        </button>
      </div>

      <div className="mmi-badge" style={{ "--mmi": mmiColor(mmi) }}>
        <span className="mmi-badge-value">{mmiLabel(mmi)}</span>
        <span className="mmi-badge-label">
          MMI terakhir
          {latest
            ? ` · ${new Date(latest.datetime).toLocaleString("id-ID")}`
            : " · belum ada"}
        </span>
      </div>

      <dl className="detail-grid">
        <div>
          <dt>Pemilik</dt>
          <dd>{device.user_name || `User #${device.user_id}`}</dd>
        </div>
        <div>
          <dt>Lokasi</dt>
          <dd>{device.location || "—"}</dd>
        </div>
        <div>
          <dt>Koordinat</dt>
          <dd>
            {device.latitude != null && device.longitude != null
              ? `${Number(device.latitude).toFixed(5)}, ${Number(device.longitude).toFixed(5)}`
              : "—"}
          </dd>
        </div>
        <div>
          <dt>IP</dt>
          <dd>{device.ip || "Belum diisi"}</dd>
        </div>
        {detail &&
          Object.entries(detail).map(([key, value]) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd>{String(value)}</dd>
            </div>
          ))}
      </dl>

      {latest ? (
        <section className="history-latest">
          <h3>History terakhir</h3>
          <dl className="detail-grid">
            {Object.entries(reading).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>
                  {key === "mmi" ? mmiLabel(value) : formatReadingValue(value)}
                </dd>
              </div>
            ))}
            <div>
              <dt>Waktu</dt>
              <dd>{new Date(latest.datetime).toLocaleString("id-ID")}</dd>
            </div>
          </dl>
        </section>
      ) : (
        <p className="muted">Belum ada pembacaan history untuk sensor ini.</p>
      )}

      <DeviceHistoryList deviceId={device.id} historyQuery={historyQuery} />

      <div className="device-actions">
        <button
          type="button"
          className="btn btn-sensor"
          disabled={!device.ip}
          onClick={() => onOpenMonitor(device, "sensor")}
          title={
            device.ip
              ? `/device-proxy/${device.ip}/5000/`
              : "IP belum diisi"
          }
        >
          Monitor sensor
        </button>
        <button
          type="button"
          className="btn btn-sensor"
          disabled={!device.ip}
          onClick={() => onOpenMonitor(device, "condition")}
          title={
            device.ip
              ? `/device-proxy/${device.ip}/5001/dashboard`
              : "IP belum diisi"
          }
        >
          Kondisi device
        </button>
      </div>
    </div>
  );
}

export default function InfoSidebar({
  open,
  onToggle,
  onClose,
  earthquakes,
  selectedId,
  onSelectQuake,
  selectedDevice,
  latestHistory,
  historyQuery,
  onClearDevice,
  onOpenMonitor,
  loading,
  syncing,
  onRefresh,
  onSync,
}) {
  return (
    <div className={`info-rail ${open ? "is-open" : "is-closed"}`}>
      <button
        type="button"
        className="sidebar-toggle"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={open ? "Sembunyikan panel info" : "Tampilkan panel info"}
        title={open ? "Sembunyikan" : "Tampilkan info"}
      >
        {open ? "›" : "‹"}
      </button>

      <aside className="info-sidebar" aria-hidden={!open}>
        {onClose && (
          <div className="panel-head-mobile-bar">
            <span className="panel-head-mobile-title">
              {selectedDevice ? selectedDevice.dev_id : "Informasi Gempa"}
            </span>
            <button
              type="button"
              className="btn btn-ghost panel-close-mobile"
              onClick={onClose}
            >
              Tutup
            </button>
          </div>
        )}

        {selectedDevice ? (
          <SensorDetail
            device={selectedDevice}
            latest={latestHistory}
            historyQuery={historyQuery}
            onOpenMonitor={onOpenMonitor}
            onClose={onClearDevice}
          />
        ) : (
          <div className="info-quakes">
            <div className="panel-head panel-head-desktop">
              <h2>Informasi Gempa Terkini</h2>
              <span>{loading ? "…" : `${earthquakes.length} event`}</span>
            </div>
            <div className="panel-actions">
              <button
                type="button"
                className="btn"
                onClick={onRefresh}
                disabled={loading}
              >
                Refresh
              </button>
              <button
                type="button"
                className="btn btn-accent"
                onClick={onSync}
                disabled={syncing}
              >
                {syncing ? "Syncing…" : "Sinkronkan"}
              </button>
            </div>
            <EarthquakeList
              earthquakes={earthquakes}
              selectedId={selectedId}
              onSelect={onSelectQuake}
            />
          </div>
        )}
      </aside>
    </div>
  );
}
