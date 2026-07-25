import { useEffect, useRef, useState } from "react";

/** Interval refresh iframe (ms). 0 = matikan. Cadangan jika device tanpa WS. */
const REFRESH_MS = 3000;

export default function IframeModal({ title, url, onClose }) {
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef(null);

  useEffect(() => {
    setLoading(true);
  }, [url]);

  // Soft-realtime: reload berkala lewat same-origin proxy (tanpa andalkan WS)
  useEffect(() => {
    if (!url || !REFRESH_MS) return undefined;
    const id = window.setInterval(() => {
      const frame = iframeRef.current;
      if (!frame) return;
      try {
        frame.contentWindow?.location.reload();
      } catch {
        frame.src = url;
      }
    }, REFRESH_MS);
    return () => window.clearInterval(id);
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
            ref={iframeRef}
            className={`modal-iframe ${loading ? "is-loading" : ""}`}
            src={url}
            title={title}
            allow="fullscreen"
            referrerPolicy="no-referrer-when-downgrade"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals"
            onLoad={() => setLoading(false)}
          />
        </div>
      </div>
    </div>
  );
}
