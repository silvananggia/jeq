import { Router } from "express";
import { query } from "../db.js";
import { syncIndonesiaEarthquakes } from "../services/bmkg.js";

const router = Router();

function endOfDayIso(value) {
  if (!value) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T23:59:59.999Z`;
  return value;
}

function startOfDayIso(value) {
  if (!value) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T00:00:00.000Z`;
  return value;
}

/** GET /api/earthquakes — list stored quakes (Indonesia) */
router.get("/", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const minMag = req.query.min_magnitude;
    const days = req.query.days;
    const hours = req.query.hours;
    const from = req.query.from;
    const to = req.query.to;

    const params = [];
    const where = [];

    if (minMag != null && minMag !== "") {
      params.push(Number(minMag));
      where.push(`magnitude >= $${params.length}`);
    }

    if (from) {
      params.push(startOfDayIso(String(from)));
      where.push(`datetime >= $${params.length}::timestamptz`);
    }

    if (to) {
      params.push(endOfDayIso(String(to)));
      where.push(`datetime <= $${params.length}::timestamptz`);
    }

    if (!from && hours) {
      params.push(Number(hours));
      where.push(`datetime >= NOW() - ($${params.length} || ' hours')::interval`);
    } else if (!from && !to && days) {
      params.push(Number(days));
      where.push(`datetime >= NOW() - ($${params.length} || ' days')::interval`);
    }

    params.push(limit);

    const sql = `
      SELECT id, datetime, location, latitude, longitude,
             magnitude, depth_km, source, created_at
      FROM earthquakes
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY datetime DESC
      LIMIT $${params.length}
    `;

    const { rows } = await query(sql, params);
    res.json({ data: rows, count: rows.length });
  } catch (error) {
    console.error("GET /api/earthquakes", error);
    res.status(500).json({ error: error.message });
  }
});

/** POST|GET /api/earthquakes/sync — pull BMKG Indonesia events into DB */
async function syncHandler(req, res) {
  try {
    const body = req.method === "POST" ? req.body || {} : {};
    const minmagnitude =
      Number(body.minmagnitude || req.query.minmagnitude) || 2.5;

    const result = await syncIndonesiaEarthquakes(query, {
      minmagnitude,
    });

    res.json({ data: result });
  } catch (error) {
    console.error("POST /api/earthquakes/sync", error);
    res.status(500).json({ error: error.message });
  }
}

router.post("/sync", syncHandler);
router.get("/sync", syncHandler);

export default router;
