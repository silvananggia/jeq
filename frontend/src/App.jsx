import { useCallback, useEffect, useMemo, useState } from "react";
import MapView from "./components/MapView";
import SensorList from "./components/SensorList";
import InfoSidebar from "./components/InfoSidebar";
import BasemapPicker from "./components/BasemapPicker";
import IframeModal from "./components/IframeModal";
import {
  getDevices,
  getEarthquakes,
  getHistories,
  syncEarthquakes,
} from "./api/client";
import { latestHistoryByDevice } from "./utils/mmi";
import { DEFAULT_BASEMAP } from "./utils/basemaps";

const MONITOR_PORTS = {
  sensor: { port: 5000, title: "Monitor sensor", path: "/" },
  condition: { port: 5001, title: "Kondisi device", path: "/dashboard" },
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function App() {
  const [earthquakes, setEarthquakes] = useState([]);
  const [devices, setDevices] = useState([]);
  const [histories, setHistories] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [monitor, setMonitor] = useState(null);
  const [filterMode, setFilterMode] = useState("hours"); // hours | range
  const [hours, setHours] = useState(24);
  const [dateFrom, setDateFrom] = useState(daysAgoIso(7));
  const [dateTo, setDateTo] = useState(todayIso());
  const [minMag, setMinMag] = useState(2.5);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [syncInfo, setSyncInfo] = useState(null);
  const [basemap, setBasemap] = useState(DEFAULT_BASEMAP);

  const quakeQuery = useMemo(() => {
    if (filterMode === "range") {
      return { from: dateFrom || undefined, to: dateTo || undefined, minMagnitude: minMag };
    }
    return { hours, minMagnitude: minMag };
  }, [filterMode, hours, dateFrom, dateTo, minMag]);

  const historyQuery = useMemo(() => {
    if (filterMode === "range") {
      return { from: dateFrom || undefined, to: dateTo || undefined };
    }
    return { hours };
  }, [filterMode, hours, dateFrom, dateTo]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [eqRes, deviceRes, histRes] = await Promise.all([
        getEarthquakes({ ...quakeQuery, limit: 250 }),
        getDevices(),
        getHistories({ ...historyQuery, limit: 500 }),
      ]);
      setEarthquakes(eqRes.data || []);
      setDevices(deviceRes.data || []);
      setHistories(histRes.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [quakeQuery, historyQuery]);

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 60_000);
    return () => clearInterval(timer);
  }, [loadData]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setMonitor(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const latestByDevice = useMemo(
    () => latestHistoryByDevice(histories),
    [histories]
  );

  const selectedDevice =
    devices.find((d) => d.id === selectedDeviceId) || null;

  const latestHistory = selectedDevice
    ? latestByDevice.get(selectedDevice.id) ||
      latestByDevice.get(selectedDevice.dev_id) ||
      null
    : null;

  async function handleSync() {
    setSyncing(true);
    setError("");
    try {
      const body =
        filterMode === "range"
          ? { from: dateFrom, to: dateTo, minmagnitude: minMag }
          : { hours, minmagnitude: minMag };
      const res = await syncEarthquakes(body);
      setSyncInfo(res.data);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  }

  function handleSelectDevice(device) {
    setSelectedDeviceId(device?.id ?? null);
    if (device) {
      setSelectedId(null);
      setSidebarOpen(true);
    }
  }

  function handleSelectQuake(eq) {
    setSelectedId(eq.id);
    setSelectedDeviceId(null);
    setSidebarOpen(true);
  }

  function handleOpenMonitor(device, kind) {
    const cfg = MONITOR_PORTS[kind];
    if (!device?.ip || !cfg) return;
    // Same-origin proxy (nginx /device-proxy) — hindari blokir Chrome
    // "public page → local network" saat iframe langsung ke IP privat/Tailscale.
    const path = cfg.path || "/";
    const normalized = path.startsWith("/") ? path : `/${path}`;
    setMonitor({
      title: `${cfg.title} · ${device.dev_id}`,
      url: `/device-proxy/${device.ip}/${cfg.port}${normalized}`,
    });
  }

  function handleHoursPreset(value) {
    setFilterMode("hours");
    setHours(value);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">JEQ</span>
          <div>
            <h1>Jasindo Eartquake Platform</h1>
            <p>Informasi Gempa Terkini · Sensor Gempa</p>
          </div>
        </div>

        <div className="filters">
          <div className="filter-group">
            <span className="filter-label">Interval</span>
            <div className="chip-row">
              {[24, 48, 72].map((h) => (
                <button
                  key={h}
                  type="button"
                  className={`chip ${filterMode === "hours" && hours === h ? "is-active" : ""}`}
                  onClick={() => handleHoursPreset(h)}
                >
                  {h}j
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <span className="filter-label">Rentang</span>
            <div className="date-range">
              <input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => {
                  setFilterMode("range");
                  setDateFrom(e.target.value);
                }}
                aria-label="Dari tanggal"
              />
              <span className="date-sep">–</span>
              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => {
                  setFilterMode("range");
                  setDateTo(e.target.value);
                }}
                aria-label="Sampai tanggal"
              />
            </div>
          </div>

          <label>
            Min M
            <select
              value={minMag}
              onChange={(e) => setMinMag(Number(e.target.value))}
            >
              <option value={2.5}>2.5</option>
              <option value={3}>3.0</option>
              <option value={4}>4.0</option>
              <option value={5}>5.0</option>
            </select>
          </label>
        </div>
      </header>

      {error && <div className="banner error">{error}</div>}
      {syncInfo && (
        <div className="banner ok">
          Sync gempa: {syncInfo.inserted} baru · {syncInfo.skipped} skip ·{" "}
          {syncInfo.fetched} diambil
          <button
            type="button"
            className="btn btn-ghost banner-dismiss"
            onClick={() => setSyncInfo(null)}
          >
            Tutup
          </button>
        </div>
      )}

      <main className={`layout ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
        <SensorList
          devices={devices}
          latestByDevice={latestByDevice}
          selectedDeviceId={selectedDeviceId}
          onSelect={handleSelectDevice}
        />

        <section className="map-pane">
          <MapView
            earthquakes={earthquakes}
            devices={devices}
            latestByDevice={latestByDevice}
            selectedId={selectedId}
            selectedDeviceId={selectedDeviceId}
            basemap={basemap}
            onSelectQuake={handleSelectQuake}
            onSelectDevice={handleSelectDevice}
          />
          <BasemapPicker value={basemap} onChange={setBasemap} />
          <div className="map-legend">
            <span className="dot quake" /> Informasi Gempa Terkini
            <span className="dot device" /> Sensor (MMI)
          </div>
        </section>

        <InfoSidebar
          open={sidebarOpen}
          onToggle={() => setSidebarOpen((v) => !v)}
          earthquakes={earthquakes}
          selectedId={selectedId}
          onSelectQuake={handleSelectQuake}
          selectedDevice={selectedDevice}
          latestHistory={latestHistory}
          onClearDevice={() => setSelectedDeviceId(null)}
          onOpenMonitor={handleOpenMonitor}
          loading={loading}
          syncing={syncing}
          onRefresh={loadData}
          onSync={handleSync}
        />
      </main>

      {monitor && (
        <IframeModal
          title={monitor.title}
          url={monitor.url}
          onClose={() => setMonitor(null)}
        />
      )}
    </div>
  );
}
