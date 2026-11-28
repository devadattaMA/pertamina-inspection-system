import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import { requirePermission } from "../../../lib/auth";
import { getDatabaseUrl } from "../../../lib/env";
import { parseCreateUserInput } from "../../../lib/auth-validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requirePermission(request, "manage_users");
  if (!auth.authorized) return auth.response;
  try {
    const sql = neon(getDatabaseUrl());
    const users = await sql`SELECT id::text AS id, name, email, role, is_active AS "isActive",
      must_change_password AS "mustChangePassword", created_at AS "createdAt"
      FROM users ORDER BY created_at DESC, name`;
    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error("List users failed:", error);
    return NextResponse.json({ success: false, message: "Unable to load users." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requirePermission(request, "manage_users");
  if (!auth.authorized) return auth.response;
  try {
    const input = parseCreateUserInput(await request.json().catch(() => null));
    if (!input) return NextResponse.json({ success: false, message: "Invalid name, email, role, or temporary password." }, { status: 400 });
    const passwordHash = await bcrypt.hash(input.temporaryPassword, 12);
    const sql = neon(getDatabaseUrl());
    const rows = await sql`INSERT INTO users(name,email,password_hash,role,is_active,must_change_password,created_by,updated_by)
      VALUES(${input.name},${input.email},${passwordHash},${input.role},TRUE,${input.mustChangePassword},${auth.user.id}::uuid,${auth.user.id}::uuid)
      ON CONFLICT DO NOTHING
      RETURNING id::text AS id,name,email,role,is_active AS "isActive",must_change_password AS "mustChangePassword"`;
    if (!rows.length) return NextResponse.json({ success: false, message: "Email already exists." }, { status: 409 });
    return NextResponse.json({ success: true, user: rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Create user failed:", error);
    return NextResponse.json({ success: false, message: "Unable to create user." }, { status: 500 });
  }
}
