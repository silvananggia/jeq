/** MMI intensity → color (Modified Mercalli scale) */
export function mmiColor(mmi) {
  const v = Number(mmi);
  if (!Number.isFinite(v) || v <= 0) return "#5c7a86";
  if (v < 2) return "#a8dadc";
  if (v < 3) return "#48cae4";
  if (v < 4) return "#90be6d";
  if (v < 5) return "#f9c74f";
  if (v < 6) return "#f48c06";
  if (v < 7) return "#e85d04";
  if (v < 8) return "#d00000";
  return "#6a040f";
}

export function mmiLabel(mmi) {
  const v = Number(mmi);
  if (!Number.isFinite(v) || v <= 0) return "—";
  return v.toFixed(1);
}

/** Sensor reading payload from a history row (`data` JSONB). */
export function historyData(history) {
  if (!history) return {};
  const raw = history.data;
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) || {};
    } catch {
      return {};
    }
  }
  return typeof raw === "object" ? raw : {};
}

export function historyMmi(history) {
  const data = historyData(history);
  return data.mmi ?? history?.mmi ?? null;
}

export function latestHistoryByDevice(histories = []) {
  const map = new Map();
  for (const h of histories) {
    const key = h.device_id ?? h.dev_id;
    if (key == null) continue;
    const prev = map.get(key);
    if (!prev || new Date(h.datetime) > new Date(prev.datetime)) {
      map.set(key, h);
    }
  }
  return map;
}
