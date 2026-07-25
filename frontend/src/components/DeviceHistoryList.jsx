import { useEffect, useState } from "react";
import { getHistories } from "../api/client";
import { historyData, historyMmi, mmiColor, mmiLabel } from "../utils/mmi";

const PAGE_SIZE = 8;

function formatReadingValue(value) {
  if (value == null) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function summaryFromReading(reading) {
  const prefer = ["horiz_pga", "vert_pga", "pgv_cm", "dom_freq"];
  const parts = [];
  for (const key of prefer) {
    if (reading[key] != null && reading[key] !== "") {
      parts.push(`${key}: ${formatReadingValue(reading[key])}`);
    }
    if (parts.length >= 2) break;
  }
  if (!parts.length) {
    const keys = Object.keys(reading).filter((k) => k !== "mmi").slice(0, 2);
    for (const key of keys) {
      parts.push(`${key}: ${formatReadingValue(reading[key])}`);
    }
  }
  return parts.join(" · ") || "—";
}

export default function DeviceHistoryList({ deviceId, historyQuery }) {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    setPage(1);
    setExpandedId(null);
  }, [deviceId, historyQuery]);

  useEffect(() => {
    if (!deviceId) return undefined;

    let cancelled = false;
    setLoading(true);
    setError("");

    getHistories({
      deviceId,
      ...historyQuery,
      limit: PAGE_SIZE,
      page,
    })
      .then((res) => {
        if (cancelled) return;
        setRows(res.data || []);
        setTotal(res.total ?? res.count ?? 0);
        setPages(res.pages ?? 1);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setRows([]);
        setTotal(0);
        setPages(1);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [deviceId, historyQuery, page]);

  return (
    <section className="history-list-section">
      <div className="history-list-head">
        <h3>Daftar history</h3>
        <span className="muted">
          {loading ? "Memuat…" : `${total} data`}
        </span>
      </div>

      {error && <p className="history-list-error">{error}</p>}

      {!loading && !rows.length && !error && (
        <p className="muted">Tidak ada history pada filter waktu ini.</p>
      )}

      <ul className="history-list">
        {rows.map((row) => {
          const reading = historyData(row);
          const mmi = historyMmi(row);
          const color = mmiColor(mmi);
          const open = expandedId === row.id;

          return (
            <li key={row.id}>
              <button
                type="button"
                className={`history-item ${open ? "is-open" : ""}`}
                style={{ "--mmi": color }}
                onClick={() => setExpandedId(open ? null : row.id)}
              >
                <span className="history-mmi">{mmiLabel(mmi)}</span>
                <span className="history-meta">
                  <strong>
                    {new Date(row.datetime).toLocaleString("id-ID")}
                  </strong>
                  <small>{summaryFromReading(reading)}</small>
                </span>
              </button>

              {open && (
                <dl className="detail-grid history-item-detail">
                  {Object.entries(reading).map(([key, value]) => (
                    <div key={key}>
                      <dt>{key}</dt>
                      <dd>
                        {key === "mmi"
                          ? mmiLabel(value)
                          : formatReadingValue(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </li>
          );
        })}
      </ul>

      {pages > 1 && (
        <div className="history-paging">
          <button
            type="button"
            className="btn"
            disabled={loading || page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <span className="muted">
            Halaman {page} / {pages}
          </span>
          <button
            type="button"
            className="btn"
            disabled={loading || page >= pages}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}
