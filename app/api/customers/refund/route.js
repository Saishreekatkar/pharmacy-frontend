// app/api/customers/refund/route.js
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const customer_id = parseInt(body?.customer_id, 10);
  if (!customer_id) return NextResponse.json({ success: false, message: "customer_id required" }, { status: 400 });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // load customer info (if gone, we still try to find bills by name/phone via provided body)
    const [custRows] = await conn.query("SELECT name, phone FROM customers WHERE customer_id = ?", [customer_id]);
    const cust = custRows[0] || {};

    // find bills by id OR fallback to bills that have matching customer_name/customer_phone
    const [bills] = await conn.query(
      `SELECT bill_id, customer_name, customer_phone, customer_id
       FROM bills
       WHERE customer_id = ?
          OR (customer_id IS NULL AND (customer_name = ? OR customer_phone = ?))`,
      [customer_id, cust.name || body?.name || "", cust.phone || body?.phone || ""]
    );

    if (!bills || bills.length === 0) {
      // nothing to restore; delete customer record if exists
      const [delCust] = await conn.query("DELETE FROM customers WHERE customer_id = ?", [customer_id]);
      await conn.commit();
      return NextResponse.json({ success: true, message: "No bills found; customer deleted", deletedCustomers: delCust.affectedRows || 0 });
    }

    const billIds = bills.map(b => b.bill_id);
    const placeholders = billIds.map(() => "?").join(",");

    // compute restore summary
    const [items] = await conn.query(
      `SELECT bi.medicine_id, SUM(bi.quantity) AS restore_qty
       FROM bill_items bi
       WHERE bi.bill_id IN (${placeholders})
       GROUP BY bi.medicine_id`,
      billIds
    );

    // restore stock (use JOIN to update medicines)
    if (items.length > 0) {
      await conn.query(
        `UPDATE medicines m
         JOIN (
           SELECT bi.medicine_id, SUM(bi.quantity) AS restore_qty
           FROM bill_items bi
           WHERE bi.bill_id IN (${placeholders})
           GROUP BY bi.medicine_id
         ) t ON m.medicine_id = t.medicine_id
         SET m.quantity = m.quantity + t.restore_qty`,
        [...billIds, ...billIds] // placeholders used twice
      );
    }

    // delete bill_items explicitly (in case FK isn't set). If ON DELETE CASCADE exists, this is redundant but safe.
    await conn.query(`DELETE FROM bill_items WHERE bill_id IN (${placeholders})`, billIds);

    // delete bills
    const [delBillsRes] = await conn.query(`DELETE FROM bills WHERE bill_id IN (${placeholders})`, billIds);

    // delete customer
    const [delCustRes] = await conn.query("DELETE FROM customers WHERE customer_id = ?", [customer_id]);

    await conn.commit();

    return NextResponse.json({
      success: true,
      message: "Refund complete",
      refundedBills: billIds.length,
      deletedBills: delBillsRes.affectedRows || 0,
      deletedCustomers: delCustRes.affectedRows || 0,
      restoreSummary: items
    });

  } catch (err) {
    await conn.rollback();
    console.error("REFUND ERROR:", err);
    return NextResponse.json({ success: false, message: "Refund failed", error: String(err) }, { status: 500 });
  } finally {
    try { conn.release(); } catch (_) {}
  }
}
