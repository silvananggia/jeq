import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { query } from "./db.js";
import { syncIndonesiaEarthquakes } from "./services/usgs.js";
import earthquakesRouter from "./routes/earthquakes.js";
import usersRouter from "./routes/users.js";
import devicesRouter from "./routes/devices.js";
import historiesRouter from "./routes/histories.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const SYNC_INTERVAL_MS = Number(process.env.USGS_SYNC_INTERVAL_MS) || 15 * 60 * 1000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", async (_req, res) => {
  try {
    await query("SELECT 1");
    res.json({ ok: true, service: "jeq-backend" });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.use("/api/earthquakes", earthquakesRouter);
app.use("/api/users", usersRouter);
app.use("/api/devices", devicesRouter);
app.use("/api/histories", historiesRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`JEQ backend listening on http://0.0.0.0:${PORT}`);

  // Initial USGS sync + periodic refresh for Indonesia
  const runSync = () =>
    syncIndonesiaEarthquakes(query, { days: 30, minmagnitude: 2.5 })
      .then((r) => console.log("[USGS sync]", r))
      .catch((e) => console.error("[USGS sync failed]", e.message));

  runSync();
  setInterval(runSync, SYNC_INTERVAL_MS);
});
