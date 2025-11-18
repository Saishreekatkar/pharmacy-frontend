import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req) {
  const { customer_id } = await req.json();
  if (!customer_id) {
    return NextResponse.json({ success: false, message: "customer_id required" }, { status: 400 });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1️⃣ Get all bills for that customer
    const [bills] = await conn.query(
      "SELECT bill_id FROM bills WHERE customer_id = ?",
      [customer_id]
    );

    if (bills.length === 0) {
      await conn.query("DELETE FROM customers WHERE customer_id = ?", [customer_id]);
      await conn.commit();
      return NextResponse.json({ success: true, message: "No bills found; customer deleted" });
    }

    const billIds = bills.map((b) => b.bill_id);
    const placeholders = billIds.map(() => "?").join(",");

    // 2️⃣ Get bill_items grouped by medicine_id
    const [items] = await conn.query(
      `SELECT medicine_id, SUM(quantity) AS restore_qty
       FROM bill_items
       WHERE bill_id IN (${placeholders})
       GROUP BY medicine_id`,
      billIds
    );

    // 3️⃣ Restore stock
    for (const item of items) {
      await conn.query(
        "UPDATE medicines SET quantity = quantity + ? WHERE medicine_id = ?",
        [item.restore_qty, item.medicine_id]
      );
    }

    // 4️⃣ Delete bill_items
    await conn.query(
      `DELETE FROM bill_items WHERE bill_id IN (${placeholders})`,
      billIds
    );

    // 5️⃣ Delete bills
    await conn.query(
      `DELETE FROM bills WHERE bill_id IN (${placeholders})`,
      billIds
    );

    // 6️⃣ Delete customer
    await conn.query(
      "DELETE FROM customers WHERE customer_id = ?",
      [customer_id]
    );

    await conn.commit();

    return NextResponse.json({
      success: true,
      message: "Refund complete — stock restored and customer deleted",
    });

  } catch (err) {
    await conn.rollback();
    console.error("REFUND ERROR:", err);
    return NextResponse.json({ success: false, message: "Refund failed" }, { status: 500 });
  } finally {
    conn.release();
  }
}
