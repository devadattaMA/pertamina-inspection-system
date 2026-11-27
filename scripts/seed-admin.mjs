import { existsSync } from "node:fs";
import bcrypt from "bcryptjs";
import { Pool } from "@neondatabase/serverless";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const connectionString=process.env.DIRECT_URL?.trim(), email=process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase(), password=process.env.SEED_ADMIN_PASSWORD;
if(!connectionString) throw new Error("DIRECT_URL is required.");
const url=new URL(connectionString);
if(!["postgres:","postgresql:"].includes(url.protocol)||url.searchParams.get("sslmode")!=="require"||url.hostname.includes("-pooler")) throw new Error("DIRECT_URL must be a direct PostgreSQL URL with sslmode=require.");
if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254) throw new Error("SEED_ADMIN_EMAIL must be valid.");
if(!password||password.length<12||Buffer.byteLength(password,"utf8")>72) throw new Error("SEED_ADMIN_PASSWORD must be 12 to 72 UTF-8 bytes.");
const hash=await bcrypt.hash(password,12), pool=new Pool({connectionString,max:1});
let client;
try {
  client=await pool.connect(); await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(78123457)");
  const existing=await client.query("SELECT id,role,is_active FROM users WHERE LOWER(email)=$1 LIMIT 1",[email]);
  if(existing.rows.length) {
    if(existing.rows[0].role!=="admin"||!existing.rows[0].is_active) throw new Error("The email exists but is not an active admin; no role escalation performed.");
    await client.query("COMMIT"); console.log("Active admin already exists; no changes made.");
  } else {
    const admin=await client.query("SELECT id FROM users WHERE role='admin' AND is_active=TRUE LIMIT 1");
    if(admin.rows.length) throw new Error("An active admin already exists. Use admin account management instead.");
    const result=await client.query("INSERT INTO users(name,email,password_hash,role,is_active,must_change_password) VALUES('Administrator',$1,$2,'admin',TRUE,TRUE) RETURNING id",[email,hash]);
    await client.query("COMMIT"); console.log(`Created first administrator ${result.rows[0].id}; password change required on first login.`);
  }
} catch(error) { await client?.query("ROLLBACK").catch(()=>undefined); console.error("Admin seed failed:",error); process.exitCode=1; }
finally { client?.release(); await pool.end(); }
