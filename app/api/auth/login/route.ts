import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import { getAuthSecret, getDatabaseUrl } from "../../../../lib/env";
import { createSessionToken, hashRateLimitKey, hashSessionToken, SESSION_TTL_SECONDS } from "../../../../lib/auth-security";
import { setSessionCookie } from "../../../../lib/auth";
import { parseLoginInput } from "../../../../lib/auth-validation";

export const dynamic = "force-dynamic";
const DUMMY_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

export async function POST(request: Request) {
  try {
    const input = parseLoginInput(await request.json().catch(() => null));
    if (!input) return NextResponse.json({ success: false, message: "Masukkan email dan kata sandi yang valid." }, { status: 400 });
    const secret = getAuthSecret();
    const sql = neon(getDatabaseUrl());
    const ip = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const key = hashRateLimitKey(`login:${ip}`, secret);
    const limits = await sql`
      INSERT INTO auth_rate_limits (key_hash, window_started_at, attempts) VALUES (${key}, NOW(), 1)
      ON CONFLICT (key_hash) DO UPDATE SET
        attempts = CASE WHEN auth_rate_limits.window_started_at <= NOW() - INTERVAL '15 minutes' THEN 1 ELSE auth_rate_limits.attempts + 1 END,
        window_started_at = CASE WHEN auth_rate_limits.window_started_at <= NOW() - INTERVAL '15 minutes' THEN NOW() ELSE auth_rate_limits.window_started_at END,
        blocked_until = CASE WHEN auth_rate_limits.window_started_at <= NOW() - INTERVAL '15 minutes' THEN NULL
          WHEN auth_rate_limits.attempts + 1 >= 10 THEN NOW() + INTERVAL '15 minutes' ELSE auth_rate_limits.blocked_until END,
        updated_at = NOW()
      RETURNING blocked_until AS "blockedUntil"
    `;
    if (limits[0]?.blockedUntil && new Date(limits[0].blockedUntil).getTime() > Date.now()) {
      return NextResponse.json({ success: false, message: "Terlalu banyak percobaan masuk. Coba lagi setelah 15 menit." }, { status: 429 });
    }
    const rows = await sql`
      SELECT id::text AS id, name, email, password_hash AS "passwordHash", role,
        is_active AS "isActive", must_change_password AS "mustChangePassword", locked_until AS "lockedUntil"
      FROM users WHERE LOWER(email) = ${input.email} LIMIT 1
    `;
    const user = rows[0];
    const matches = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
    const locked = Boolean(user?.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now());
    if (!user || !user.isActive || locked || !matches) {
      if (user?.isActive && !locked) await sql`
        UPDATE users SET
          failed_login_attempts = CASE WHEN locked_until IS NOT NULL AND locked_until <= NOW() THEN 1 ELSE failed_login_attempts + 1 END,
          locked_until = CASE
            WHEN (CASE WHEN locked_until IS NOT NULL AND locked_until <= NOW() THEN 1 ELSE failed_login_attempts + 1 END) >= 5 THEN NOW() + INTERVAL '15 minutes'
            WHEN locked_until IS NOT NULL AND locked_until <= NOW() THEN NULL ELSE locked_until END,
          updated_at = NOW() WHERE id = ${user.id}::uuid
      `;
      return NextResponse.json({ success: false, message: "Email atau kata sandi salah." }, { status: 401 });
    }
    await sql`UPDATE users SET failed_login_attempts = 0, locked_until = NULL, updated_at = NOW() WHERE id = ${user.id}::uuid`;
    await sql`UPDATE auth_rate_limits SET attempts = 0, window_started_at = NOW(), blocked_until = NULL, updated_at = NOW() WHERE key_hash = ${key}`;
    const token = createSessionToken();
    const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
    await sql`INSERT INTO user_sessions (user_id, token_hash, expires_at, user_agent)
      VALUES (${user.id}::uuid, ${hashSessionToken(token)}, TO_TIMESTAMP(${expiresAt}), ${(request.headers.get("user-agent") ?? "").slice(0, 512)})`;
    const response = NextResponse.json({ success: true, mustChangePassword: Boolean(user.mustChangePassword) });
    setSessionCookie(response, token, expiresAt, Boolean(user.mustChangePassword));
    return response;
  } catch (error) {
    console.error("Login failed:", error);
    return NextResponse.json({ success: false, message: "Tidak dapat memproses login sekarang." }, { status: 500 });
  }
}
