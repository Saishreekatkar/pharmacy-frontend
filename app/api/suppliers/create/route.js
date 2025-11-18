// app/api/suppliers/create/route.js
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req) {
  try {
    const body = await req.json();
    const name = (body.name || "").trim();
    const contact = (body.contact || "").trim();

    if (!name) {
      return NextResponse.json({ success: false, message: "Supplier name required" }, { status: 400 });
    }

    // Insert supplier
    const [res] = await db.query(
      "INSERT INTO suppliers (name, contact) VALUES (?, ?)",
      [name, contact || null]
    );

    // res.insertId should be the new supplier_id
    return NextResponse.json({ success: true, id: res.insertId || null });
  } catch (err) {
    console.error("create supplier error:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
