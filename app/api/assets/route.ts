import { NextResponse } from "next/server";
import { sql } from "../../lib/db";
import { requirePermission } from "../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requirePermission(request, "read_workspace");
  if (!auth.authorized) return auth.response;
  try {
    const assets = await sql`
      SELECT
        asset_id,
        asset_name,
        asset_type,
        area,
        department,
        nominal_thickness,
        latest_thickness,
        operating_pressure,
        condition,
        last_inspection_date
      FROM assets
      ORDER BY asset_id
    `;

    return NextResponse.json({
      success: true,
      data: assets,
    });
  } catch (error) {
    console.error("Failed to retrieve assets:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to retrieve assets",
      },
      { status: 500 }
    );
  }
}