import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [rows] = await db.query("SELECT * FROM customers ORDER BY customer_id DESC");

    return NextResponse.json({
      success: true,
      customers: rows.map(c => ({
        id: c.customer_id,
        name: c.name,
        phone: c.phone,
        email: c.email,
      })),
    });

  } catch (err) {
    console.error("CUSTOMER GET ERROR:", err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
