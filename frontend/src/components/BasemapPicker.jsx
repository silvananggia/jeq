import { useEffect, useRef, useState } from "react";
import { BASEMAPS } from "../utils/basemaps";

export default function BasemapPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const active = BASEMAPS.find((b) => b.id === value) || BASEMAPS[0];

  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      className={`basemap-picker ${open ? "is-open" : ""}`}
      ref={rootRef}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className="basemap-picker-row" role="listbox" aria-label="Basemap">
        {(open ? BASEMAPS : [active]).map((b) => {
          const selected = b.id === value;
          return (
            <button
              key={b.id}
              type="button"
              role="option"
              aria-selected={selected}
              className={`basemap-tile ${selected ? "is-active" : ""}`}
              onClick={() => {
                if (!open) {
                  setOpen(true);
                  return;
                }
                onChange(b.id);
                setOpen(false);
              }}
              title={b.label}
            >
              <img src={b.thumb} alt="" loading="lazy" draggable={false} />
              <span>{b.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
