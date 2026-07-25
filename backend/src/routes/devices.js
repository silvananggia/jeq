import { Router } from "express";
import { query } from "../db.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const { rows } = await query(
      `SELECT d.id, d.dev_id, d.user_id, d.location, d.latitude, d.longitude,
              d.ip, d.detail, d.created_at, u.name AS user_name
       FROM devices d
       LEFT JOIN users u ON u.id = d.user_id
       ORDER BY d.id ASC`
    );
    res.json({ data: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { dev_id, user_id, location, latitude, longitude, ip, detail } =
      req.body || {};

    if (!dev_id || !user_id) {
      return res
        .status(400)
        .json({ error: "dev_id and user_id are required" });
    }

    const { rows } = await query(
      `INSERT INTO devices
         (dev_id, user_id, location, latitude, longitude, ip, detail)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, dev_id, user_id, location, latitude, longitude, ip, detail, created_at`,
      [
        dev_id,
        user_id,
        location || null,
        latitude ?? null,
        longitude ?? null,
        ip || null,
        detail ? JSON.stringify(detail) : null,
      ]
    );
    res.status(201).json({ data: rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, dev_id, user_id, location, latitude, longitude, ip, detail, created_at
       FROM devices WHERE id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Device not found" });
    res.json({ data: rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/** Raspberry Pi heartbeat / metadata update by hardware dev_id */
router.patch("/by-dev/:devId", async (req, res) => {
  try {
    const { location, latitude, longitude, ip, detail } = req.body || {};
    const { rows } = await query(
      `UPDATE devices SET
         location = COALESCE($2, location),
         latitude = COALESCE($3, latitude),
         longitude = COALESCE($4, longitude),
         ip = COALESCE($5, ip),
         detail = COALESCE($6, detail)
       WHERE dev_id = $1
       RETURNING id, dev_id, user_id, location, latitude, longitude, ip, detail, created_at`,
      [
        req.params.devId,
        location ?? null,
        latitude ?? null,
        longitude ?? null,
        ip ?? null,
        detail ? JSON.stringify(detail) : null,
      ]
    );
    if (!rows.length) return res.status(404).json({ error: "Device not found" });
    res.json({ data: rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
