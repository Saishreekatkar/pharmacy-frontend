import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const [rows] = await db.query(
    "SELECT medicine_id AS id, name, price, quantity FROM medicines ORDER BY medicine_id DESC"
  );

  return NextResponse.json({ success: true, medicines: rows });
}
