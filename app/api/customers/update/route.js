import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req) {
  try {
    const body = await req.json();
    const { customer_id, name, phone, email, age } = body;

    if (!customer_id || !name) {
      return NextResponse.json({ success: false, message: "customer_id and name required" }, { status: 400 });
    }

    await db.query(
      "UPDATE customers SET name = ?, phone = ?, email = ? WHERE customer_id = ?",
      [name, phone || null, email || null, customer_id]
    );

    return NextResponse.json({ success: true, message: "Customer updated" });
  } catch (err) {
    console.error("customers/update error:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
