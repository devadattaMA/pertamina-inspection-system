import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import { getDatabaseUrl } from "../../../lib/env";
import { getAuthenticatedUser, getSignedSession, setSessionCookie } from "../../../lib/auth";
import { hashSessionToken } from "../../../lib/auth-security";
import { isValidNewPassword } from "../../../lib/auth-validation";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    const session = getSignedSession(request);
    if (!user || !session) return NextResponse.json({ success: false, message: "Authentication required." }, { status: 401 });
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const current = typeof body?.currentPassword === "string" ? body.currentPassword : "";
    const next = body?.newPassword;
    if (!current || !isValidNewPassword(next)) return NextResponse.json({ success: false, message: "Kata sandi baru minimal 12 karakter." }, { status: 400 });
    const sql = neon(getDatabaseUrl());
    const rows = await sql`SELECT password_hash AS "passwordHash" FROM users WHERE id = ${user.id}::uuid LIMIT 1`;
    if (!rows[0] || !(await bcrypt.compare(current, rows[0].passwordHash))) return NextResponse.json({ success: false, message: "Kata sandi saat ini tidak benar." }, { status: 400 });
    if (await bcrypt.compare(next, rows[0].passwordHash)) return NextResponse.json({ success: false, message: "Gunakan kata sandi baru yang berbeda." }, { status: 400 });
    const hash = await bcrypt.hash(next, 12);
    await sql`UPDATE users SET password_hash = ${hash}, must_change_password = FALSE, failed_login_attempts = 0, locked_until = NULL, updated_at = NOW(), updated_by = ${user.id}::uuid WHERE id = ${user.id}::uuid`;
    await sql`DELETE FROM user_sessions WHERE user_id = ${user.id}::uuid AND token_hash <> ${hashSessionToken(session.token)}`;
    const response = NextResponse.json({ success: true });
    setSessionCookie(response, session.token, session.expiresAt, false);
    return response;
  } catch (error) {
    console.error("Password change failed:", error);
    return NextResponse.json({ success: false, message: "Unable to update password." }, { status: 500 });
  }
}
