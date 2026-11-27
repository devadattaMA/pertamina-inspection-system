import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { Pool } from "@neondatabase/serverless";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const connectionString=process.env.DIRECT_URL?.trim();
if(!connectionString) throw new Error("DIRECT_URL is required.");
const url=new URL(connectionString);
if(!["postgres:","postgresql:"].includes(url.protocol)||url.searchParams.get("sslmode")!=="require"||url.hostname.includes("-pooler")) {
  throw new Error("DIRECT_URL must be a direct PostgreSQL URL with sslmode=require and no -pooler hostname.");
}
const directory=new URL("../database/migrations/",import.meta.url);
const pool=new Pool({connectionString,max:1,connectionTimeoutMillis:10000});
let client;
try {
  client=await pool.connect();
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations(filename TEXT PRIMARY KEY,checksum CHAR(64) NOT NULL,applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  const names=(await readdir(directory)).filter(name=>/^\d+_[a-z0-9_-]+\.sql$/i.test(name)).sort();
  for(const filename of names) {
    const contents=await readFile(new URL(filename,directory),"utf8");
    const checksum=createHash("sha256").update(contents).digest("hex");
    await client.query("BEGIN");
    try {
      await client.query("SELECT pg_advisory_xact_lock(731942781)");
      const applied=await client.query("SELECT checksum FROM schema_migrations WHERE filename=$1",[filename]);
      if(applied.rows.length) {
        if(applied.rows[0].checksum!==checksum) throw new Error(`Migration ${filename} has changed after being applied.`);
        await client.query("COMMIT"); console.log(`SKIP ${filename}`); continue;
      }
      await client.query(contents);
      await client.query("INSERT INTO schema_migrations(filename,checksum) VALUES($1,$2)",[filename,checksum]);
      await client.query("COMMIT"); console.log(`APPLIED ${filename}`);
    } catch(error) { await client.query("ROLLBACK"); throw error; }
  }
  console.log("Database migrations completed.");
} catch(error) { console.error("Migration failed:",error); process.exitCode=1; }
finally { client?.release(); await pool.end(); }
