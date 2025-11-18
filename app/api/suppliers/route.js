import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [rows] = await db.query("SELECT * FROM suppliers ORDER BY supplier_id DESC");

    return NextResponse.json({
      success: true,
      suppliers: rows.map(s => ({
        id: s.supplier_id,
        name: s.name,
        contact: s.contact,
      })),
    });

  } catch (err) {
    console.error("SUPPLIER GET ERROR:", err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
