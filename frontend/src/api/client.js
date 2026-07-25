const API_BASE = import.meta.env.VITE_API_URL || "";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || `Request failed: ${res.status}`);
  }
  return json;
}

export function getEarthquakes({
  hours,
  from,
  to,
  days,
  minMagnitude = 2.5,
  limit = 200,
} = {}) {
  const params = new URLSearchParams({
    min_magnitude: String(minMagnitude),
    limit: String(limit),
  });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (!from && hours) params.set("hours", String(hours));
  if (!from && !hours && days) params.set("days", String(days));
  return request(`/api/earthquakes?${params}`);
}

export function syncEarthquakes(body = {}) {
  return request("/api/earthquakes/sync", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getDevices() {
  return request("/api/devices");
}

export function getHistories({
  deviceId,
  hours,
  from,
  to,
  days,
  limit = 50,
  page = 1,
} = {}) {
  const params = new URLSearchParams({
    limit: String(limit),
    page: String(page),
  });
  if (deviceId) params.set("device_id", String(deviceId));
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (!from && hours) params.set("hours", String(hours));
  if (!from && !hours && days) params.set("days", String(days));
  return request(`/api/histories?${params}`);
}
