import { historyMmi, mmiColor, mmiLabel } from "../utils/mmi";

export default function SensorList({
  devices,
  latestByDevice,
  selectedDeviceId,
  onSelect,
  onClose,
}) {
  return (
    <aside className="sensor-pane">
      <div className="panel-head">
        <h2>Sensor Gempa</h2>
        <div className="panel-head-actions">
          <span>{devices.length}</span>
          {onClose && (
            <button
              type="button"
              className="btn btn-ghost panel-close-mobile"
              onClick={onClose}
            >
              Tutup
            </button>
          )}
        </div>
      </div>

      {!devices.length ? (
        <p className="empty-state">Belum ada device terdaftar.</p>
      ) : (
        <ul className="sensor-list">
          {devices.map((d) => {
            const latest =
              latestByDevice.get(d.id) || latestByDevice.get(d.dev_id);
            const mmi = historyMmi(latest);
            const color = mmiColor(mmi);
            const active = selectedDeviceId === d.id;

            return (
              <li key={d.id}>
                <button
                  type="button"
                  className={`sensor-card ${active ? "is-active" : ""}`}
                  style={{ "--mmi": color }}
                  onClick={() => onSelect(active ? null : d)}
                >
                  <span className="sensor-mmi" title={`MMI ${mmiLabel(mmi)}`}>
                    {mmiLabel(mmi)}
                  </span>
                  <span className="sensor-meta">
                    <strong>{d.dev_id}</strong>
                    <span className="sensor-place">
                      {d.location || "Lokasi belum diisi"}
                    </span>
                    <small>
                      {d.user_name || `User #${d.user_id}`}
                      {latest
                        ? ` · ${new Date(latest.datetime).toLocaleString("id-ID")}`
                        : " · belum ada data"}
                    </small>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mmi-legend">
        <span>MMI</span>
        {[1, 2, 3, 4, 5, 6, 7].map((v) => (
          <i
            key={v}
            style={{ background: mmiColor(v) }}
            title={`MMI ${v}`}
          />
        ))}
      </div>
    </aside>
  );
}
