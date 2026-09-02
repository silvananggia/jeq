import { query, pool } from "../db.js";
import { syncIndonesiaEarthquakes } from "../services/bmkg.js";

const minmagnitude = Number(process.argv[2]) || 2.5;

try {
  const result = await syncIndonesiaEarthquakes(query, { minmagnitude });
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
