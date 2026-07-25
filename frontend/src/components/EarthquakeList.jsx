export default function EarthquakeList({ earthquakes, selectedId, onSelect }) {
  if (!earthquakes.length) {
    return (
      <div className="empty-state">
        Belum ada data gempa. Sinkronkan Informasi Gempa Terkini untuk wilayah Indonesia.
      </div>
    );
  }

  return (
    <ul className="quake-list">
      {earthquakes.map((eq) => {
        const mag = Number(eq.magnitude);
        const active = selectedId === eq.id;
        return (
          <li key={eq.id}>
            <button
              type="button"
              className={`quake-item ${active ? "is-active" : ""}`}
              onClick={() => onSelect(eq)}
            >
              <span className={`mag mag-${Math.floor(mag)}`}>{mag.toFixed(1)}</span>
              <span className="quake-meta">
                <span className="quake-place">{eq.location}</span>
                <span className="quake-sub">
                  {new Date(eq.datetime).toLocaleString("id-ID")} · {eq.depth_km} km
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
