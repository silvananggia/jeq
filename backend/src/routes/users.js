import { Router } from "express";
import { query } from "../db.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, name, address, created_at FROM users ORDER BY id ASC`
    );
    res.json({ data: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, address } = req.body || {};
    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }

    const { rows } = await query(
      `INSERT INTO users (name, address) VALUES ($1, $2)
       RETURNING id, name, address, created_at`,
      [name, address || null]
    );
    res.status(201).json({ data: rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, name, address, created_at FROM users WHERE id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "User not found" });
    res.json({ data: rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
