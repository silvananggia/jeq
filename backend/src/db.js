import fs from "fs";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

function isRunningInDocker() {
  try {
    return fs.existsSync("/.dockerenv");
  } catch {
    return false;
  }
}

function resolveDatabaseUrl() {
  const fallback = "postgresql://postgres:postgres@localhost:5432/jeq_platform";
  const url = process.env.DATABASE_URL || fallback;
  if (!isRunningInDocker() && url.includes("host.docker.internal")) {
    return url.replace(/host\.docker\.internal/g, "localhost");
  }
  return url;
}

export const pool = new Pool({
  connectionString: resolveDatabaseUrl(),
});

export async function query(text, params = []) {
  return pool.query(text, params);
}
