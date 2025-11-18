// app/api/dashboard/route.js
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req) {
  try {
    // allow optional ?threshold=NUMBER
    const url = new URL(req.url);
    const threshold = Math.max(0, parseInt(url.searchParams.get("threshold") || "10", 10));

    // 1) total sales for today (server local date)
    // Using DATE(date) = CURDATE() to match rows from today
    const [salesRows] = await db.query(
      `SELECT
         COALESCE(SUM(total_amount), 0) AS total_sales_today,
         COUNT(*) AS bills_today
       FROM bills
       WHERE DATE(date) = CURDATE()`
    );

    // 2) total medicines count
    const [medCountRows] = await db.query(
      `SELECT COUNT(*) AS total_medicines FROM medicines`
    );

    // 3) low stock items (<= threshold) - return a few useful fields
    const [lowRows] = await db.query(
      `SELECT medicine_id, name, quantity
       FROM medicines
       WHERE quantity <= ?
       ORDER BY quantity ASC, medicine_id ASC
       LIMIT 50`, // limit to keep response small
      [threshold]
    );

    const total_sales_today = Number(salesRows[0]?.total_sales_today ?? 0);
    const bills_today = Number(salesRows[0]?.bills_today ?? 0);
    const total_medicines = Number(medCountRows[0]?.total_medicines ?? 0);

    return NextResponse.json({
      success: true,
      total_sales_today,
      bills_today,
      total_medicines,
      low_stock_count: lowRows.length,
      low_stock: lowRows.map(r => ({
        medicine_id: r.medicine_id,
        name: r.name,
        quantity: Number(r.quantity)
      })),
      threshold
    });
  } catch (err) {
    console.error("DASHBOARD API ERROR:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
