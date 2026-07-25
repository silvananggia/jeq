import { useEffect, useState } from "react";

export default function IframeModal({ title, url, onClose }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
  }, [url]);

  if (!url) return null;

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
            className={`modal-iframe ${loading ? "is-loading" : ""}`}
            src={url}
            title={title}
            allow="fullscreen"
            onLoad={() => setLoading(false)}
          />
        </div>
      </div>
    </div>
  );
}
