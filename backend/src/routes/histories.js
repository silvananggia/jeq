import { Router } from "express";
import { query } from "../db.js";

const router = Router();

const RESERVED_KEYS = new Set([
  "device_id",
  "dev_id",
  "datetime",
  "id",
  "created_at",
  "data",
]);

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

/** Build JSON payload from body.data or flat sensor fields. */
function extractData(body = {}) {
  if (body.data != null && typeof body.data === "object" && !Array.isArray(body.data)) {
    return body.data;
  }

  const data = {};
  for (const [key, value] of Object.entries(body)) {
    if (RESERVED_KEYS.has(key)) continue;
    if (value === undefined) continue;
    data[key] = value;
  }
  return data;
}

router.get("/", async (req, res) => {
  try {
    const deviceId = req.query.device_id;
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const hours = req.query.hours;
    const days = req.query.days;
    const from = req.query.from;
    const to = req.query.to;

    const params = [];
    const where = [];

    if (deviceId) {
      params.push(Number(deviceId));
      where.push(`h.device_id = $${params.length}`);
    }

    if (from) {
      params.push(startOfDayIso(String(from)));
      where.push(`h.datetime >= $${params.length}::timestamptz`);
    }

    if (to) {
      params.push(endOfDayIso(String(to)));
      where.push(`h.datetime <= $${params.length}::timestamptz`);
    }

    if (!from && hours) {
      params.push(Number(hours));
      where.push(`h.datetime >= NOW() - ($${params.length} || ' hours')::interval`);
    } else if (!from && !to && days) {
      params.push(Number(days));
      where.push(`h.datetime >= NOW() - ($${params.length} || ' days')::interval`);
    }

    params.push(limit);

    const { rows } = await query(
      `SELECT h.id, h.device_id, h.datetime, h.data, h.created_at,
              d.dev_id, d.location AS device_location
       FROM histories h
       JOIN devices d ON d.id = h.device_id
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY h.datetime DESC
       LIMIT $${params.length}`,
      params
    );
    res.json({ data: rows, count: rows.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Ingest sensor reading from Raspberry Pi.
 * Accepts either device_id (DB pk) or dev_id (hardware id).
 * Sensor params go in `data` JSONB (nested object or flat fields).
 */
router.post("/", async (req, res) => {
  try {
    const body = req.body || {};
    let deviceId = body.device_id;

    if (!deviceId && body.dev_id) {
      const found = await query(
        `SELECT id FROM devices WHERE dev_id = $1 LIMIT 1`,
        [body.dev_id]
      );
      if (!found.rows.length) {
        return res.status(404).json({ error: "Device not found for dev_id" });
      }
      deviceId = found.rows[0].id;
    }

    if (!deviceId) {
      return res
        .status(400)
        .json({ error: "device_id or dev_id is required" });
    }

    const datetime = body.datetime || new Date().toISOString();
    const data = extractData(body);

    const { rows } = await query(
      `INSERT INTO histories (device_id, datetime, data)
       VALUES ($1, $2, $3::jsonb)
       RETURNING *`,
      [deviceId, datetime, JSON.stringify(data)]
    );

    res.status(201).json({ data: rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
