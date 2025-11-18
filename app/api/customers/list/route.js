import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [rows] = await db.query("SELECT customer_id, name, phone, email FROM customers ORDER BY customer_id DESC");
    return NextResponse.json({ success: true, customers: rows });
  } catch (err) {
    console.error("customers/list error:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
