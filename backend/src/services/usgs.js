/**
 * USGS Earthquake API — Indonesia bounding box.
 * Approx: 95°E–141°E, 11°S–6°N
 */
const INDONESIA_BBOX = {
  minlatitude: -11,
  maxlatitude: 6,
  minlongitude: 95,
  maxlongitude: 141,
};

const USGS_QUERY_URL = "https://earthquake.usgs.gov/fdsnws/event/1/query";

function toUsgsTime(date) {
  return date.toISOString().replace(/\.\d{3}Z$/, "");
}

export async function fetchIndonesiaEarthquakes({
  days = 30,
  hours = null,
  starttime = null,
  endtime = null,
  minmagnitude = 2.5,
} = {}) {
  const end = endtime ? new Date(endtime) : new Date();
  let start;
  if (starttime) {
    start = new Date(starttime);
  } else if (hours) {
    start = new Date(end.getTime() - Number(hours) * 60 * 60 * 1000);
  } else {
    start = new Date(end.getTime() - (Number(days) || 30) * 24 * 60 * 60 * 1000);
  }

  const params = new URLSearchParams({
    format: "geojson",
    starttime: toUsgsTime(start),
    endtime: toUsgsTime(end),
    minmagnitude: String(minmagnitude),
    orderby: "time",
    ...Object.fromEntries(
      Object.entries(INDONESIA_BBOX).map(([k, v]) => [k, String(v)])
    ),
  });

  const res = await fetch(`${USGS_QUERY_URL}?${params}`);
  if (!res.ok) {
    throw new Error(`USGS API error: ${res.status} ${res.statusText}`);
  }

  const geojson = await res.json();
  const features = geojson.features || [];

  return features
    .map((f) => {
      const [longitude, latitude, depth] = f.geometry?.coordinates || [];
      const p = f.properties || {};
      if (longitude == null || latitude == null) return null;

      return {
        datetime: new Date(p.time).toISOString(),
        location: p.place || "Unknown",
        latitude: Number(latitude),
        longitude: Number(longitude),
        magnitude: p.mag != null ? Number(p.mag) : null,
        depth_km: depth != null ? Number(depth) : null,
        source: "USGS",
        usgs_id: f.id || null,
      };
    })
    .filter(Boolean);
}

export async function syncIndonesiaEarthquakes(query, options = {}) {
  const events = await fetchIndonesiaEarthquakes(options);
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
    source: "USGS",
  };
}
