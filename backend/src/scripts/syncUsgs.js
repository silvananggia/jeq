import { query, pool } from "../db.js";
import { syncIndonesiaEarthquakes } from "../services/usgs.js";

const days = Number(process.argv[2]) || 30;
const minmagnitude = Number(process.argv[3]) || 2.5;

try {
  const result = await syncIndonesiaEarthquakes(query, { days, minmagnitude });
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
