/**
 * BMKG Data Gempabumi Terbuka — Indonesia.
 * https://data.bmkg.go.id/gempabumi/
 */
const BMKG_TEWS = "https://data.bmkg.go.id/DataMKG/TEWS";

const FEEDS = [
  `${BMKG_TEWS}/autogempa.json`,
  `${BMKG_TEWS}/gempaterkini.json`,
  `${BMKG_TEWS}/gempadirasakan.json`,
];

function parseDepth(value) {
  if (value == null || value === "") return null;
  const match = String(value).match(/([\d.]+)/);
  return match ? Number(match[1]) : null;
}

function parseCoordinatePair(value) {
  if (!value) return null;
  const [latRaw, lonRaw] = String(value).split(",").map((part) => part.trim());
  const latitude = Number(latRaw);
  const longitude = Number(lonRaw);
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;
  return { latitude, longitude };
}

function parseAxis(value, negativeSuffixes) {
  if (!value) return null;
  const match = String(value).match(/([\d.]+)\s*(\S+)/);
  if (!match) return null;
  const num = Number(match[1]);
  if (Number.isNaN(num)) return null;
  const suffix = match[2].toUpperCase();
  return negativeSuffixes.has(suffix) ? -num : num;
}

function parseLintangBujur(lintang, bujur) {
  const latitude = parseAxis(lintang, new Set(["LS"]));
  const longitude = parseAxis(bujur, new Set(["BB"]));
  if (latitude == null || longitude == null) return null;
  return { latitude, longitude };
}

function normalizeGempa(raw) {
  if (!raw) return null;

  const coords =
    parseCoordinatePair(raw.Coordinates) ||
    parseLintangBujur(raw.Lintang, raw.Bujur);

  if (!coords) return null;

  const datetime = raw.DateTime
    ? new Date(raw.DateTime).toISOString()
    : null;

  if (!datetime || Number.isNaN(new Date(datetime).getTime())) return null;

  const magnitude =
    raw.Magnitude != null && raw.Magnitude !== ""
      ? Number(raw.Magnitude)
      : null;

  return {
    datetime,
    location: raw.Wilayah || "Indonesia",
    latitude: coords.latitude,
    longitude: coords.longitude,
    magnitude: Number.isNaN(magnitude) ? null : magnitude,
    depth_km: parseDepth(raw.Kedalaman),
    source: "BMKG",
    bmkg_potensi: raw.Potensi || null,
    bmkg_dirasakan: raw.Dirasakan || null,
  };
}

function extractGempaList(payload) {
  const gempa = payload?.Infogempa?.gempa;
  if (!gempa) return [];
  return Array.isArray(gempa) ? gempa : [gempa];
}

async function fetchFeed(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`BMKG API error (${url}): ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function fetchIndonesiaEarthquakes({ minmagnitude = 2.5 } = {}) {
  const payloads = await Promise.all(FEEDS.map((url) => fetchFeed(url)));
  const seen = new Set();
  const events = [];

  for (const payload of payloads) {
    for (const raw of extractGempaList(payload)) {
      const eq = normalizeGempa(raw);
      if (!eq) continue;
      if (eq.magnitude != null && eq.magnitude < Number(minmagnitude)) continue;

      const key = `${eq.datetime}|${eq.latitude}|${eq.longitude}`;
      if (seen.has(key)) continue;
      seen.add(key);
      events.push(eq);
    }
  }

  return events.sort(
    (a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
  );
}

export async function syncIndonesiaEarthquakes(query, options = {}) {
  const minmagnitude = Number(options.minmagnitude) || 2.5;
  const events = await fetchIndonesiaEarthquakes({ minmagnitude });
  let inserted = 0;
  let skipped = 0;

  for (const eq of events) {
    const existing = await query(
      `SELECT id FROM earthquakes
       WHERE source = $1
         AND datetime = $2
         AND latitude = $3
         AND longitude = $4
       LIMIT 1`,
      [eq.source, eq.datetime, eq.latitude, eq.longitude]
    );

    if (existing.rows.length) {
      skipped += 1;
      continue;
    }

    await query(
      `INSERT INTO earthquakes
         (datetime, location, latitude, longitude, magnitude, depth_km, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        eq.datetime,
        eq.location,
        eq.latitude,
        eq.longitude,
        eq.magnitude,
        eq.depth_km,
        eq.source,
      ]
    );
    inserted += 1;
  }

  return {
    fetched: events.length,
    inserted,
    skipped,
    region: "Indonesia",
    source: "BMKG",
  };
}
