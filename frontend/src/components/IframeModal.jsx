import { useEffect, useRef, useState } from "react";

/** Refresh HTTP iframe berkala (tanpa WebSocket). 0 = off. */
const REFRESH_MS = 5000;

export default function IframeModal({ title, url, onClose }) {
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const iframeRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    setTick(0);
  }, [url]);

  useEffect(() => {
    if (!url || !REFRESH_MS) return undefined;
    const id = window.setInterval(() => setTick((n) => n + 1), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [url]);

  if (!url) return null;

  const src = tick === 0 ? url : `${url}${url.includes("?") ? "&" : "?"}_r=${tick}`;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <h2>{title}</h2>
            <a href={url} target="_blank" rel="noreferrer" className="modal-url">
              {url}
            </a>
          </div>
          <button type="button" className="btn modal-close" onClick={onClose}>
            Tutup
          </button>
        </div>

        <div className="modal-body">
          {loading && (
            <div className="modal-loading" role="status" aria-live="polite">
              <span className="spinner" aria-hidden="true" />
              <p>Memuat halaman…</p>
              <small>{url}</small>
            </div>
          )}
          <iframe
            ref={iframeRef}
            key={src}
            className={`modal-iframe ${loading ? "is-loading" : ""}`}
            src={src}
            title={title}
            allow="fullscreen"
            onLoad={() => setLoading(false)}
          />
        </div>
      </div>
    </div>
  );
}
