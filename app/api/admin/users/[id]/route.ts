import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import { requirePermission } from "../../../../../lib/auth";
import { getDatabaseUrl } from "../../../../../lib/env";
import { parseUpdateUserInput } from "../../../../../lib/auth-validation";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const authorization = await requirePermission(request, "manage_users");
  if (!authorization.authorized) return authorization.response;
  const { id } = await context.params;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ success: false, message: "Invalid user ID." }, { status: 400 });
  }

  try {
    const input = parseUpdateUserInput(await request.json().catch(() => null));
    if (!input) return NextResponse.json({ success: false, message: "No valid update supplied." }, { status: 400 });

    const sql = neon(getDatabaseUrl());
    const results = await sql.transaction([
      sql`SELECT pg_advisory_xact_lock(78123456)`,
      sql`WITH active_admins AS MATERIALIZED (
        SELECT COUNT(*)::int AS total FROM users WHERE role = 'admin' AND is_active = TRUE
      ), updated AS (
        UPDATE users AS u
        SET role = COALESCE(${input.role ?? null}, u.role),
            is_active = COALESCE(${input.isActive ?? null}, u.is_active),
            updated_at = NOW(),
            updated_by = ${authorization.user.id}::uuid
        WHERE u.id = ${id}::uuid
          AND (
            u.role <> 'admin'
            OR u.is_active = FALSE
            OR (
              COALESCE(${input.role ?? null}, u.role) = 'admin'
              AND COALESCE(${input.isActive ?? null}, u.is_active) = TRUE
            )
            OR (SELECT total FROM active_admins) > 1
          )
        RETURNING u.id::text AS id, u.name, u.email, u.role,
                  u.is_active AS "isActive",
                  u.must_change_password AS "mustChangePassword"
      ), revoked AS (
        DELETE FROM user_sessions s
        USING updated u
        WHERE s.user_id = u.id::uuid AND u."isActive" = FALSE
        RETURNING s.id
      )
      SELECT updated.*, (SELECT COUNT(*)::int FROM revoked) AS "revokedSessions"
      FROM updated`
    ], { isolationLevel: "ReadCommitted" });

    const rows = results[1] as Array<Record<string, unknown>>;
    if (!rows.length) {
      const existing = await sql`SELECT id FROM users WHERE id = ${id}::uuid LIMIT 1`;
      if (!existing.length) return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
      return NextResponse.json({
        success: false,
        code: "LAST_ACTIVE_ADMIN",
        message: "Cannot disable or demote the last active administrator."
      }, { status: 409 });
    }

    return NextResponse.json({ success: true, user: rows[0] });
  } catch (error) {
    console.error("Update user failed:", error);
    return NextResponse.json({ success: false, message: "Unable to update user." }, { status: 500 });
  }
}
