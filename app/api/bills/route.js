import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [rows] = await db.query("SELECT * FROM bills ORDER BY bill_id DESC");

    return NextResponse.json({
      success: true,
      bills: rows.map(b => ({
        id: b.bill_id,
        total: b.total_amount,   // updated
        date: b.date,            // updated
        customer: {
          name: b.customer_name,
          phone: b.customer_phone,
          age: b.customer_age,
        }
      })),
    });

  } catch (err) {
    console.error("BILLS GET ERROR:", err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
