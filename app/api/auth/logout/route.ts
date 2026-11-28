import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import { getDatabaseUrl } from "../../../lib/env";
import { clearSessionCookie, getSignedSession } from "../../../lib/auth";
import { hashSessionToken } from "../../../lib/auth-security";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const response = NextResponse.json({ success: true });
  try {
    const session = getSignedSession(request);
    if (session) {
      const sql = neon(getDatabaseUrl());
      await sql`DELETE FROM user_sessions WHERE token_hash = ${hashSessionToken(session.token)}`;
    }
  } catch (error) {
    console.error("Logout revocation failed:", error);
    clearSessionCookie(response);
    return NextResponse.json({ success: false, message: "Browser session cleared; server session revocation failed." }, { status: 503 });
  }
  clearSessionCookie(response);
  return response;
}
