import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req, { params }) {
  const bill_id = parseInt(params.id, 10);

  if (!bill_id) {
    return NextResponse.json(
      { success: false, message: "Invalid bill ID" },
      { status: 400 }
    );
  }

  try {
    // 1️⃣ Get bill main data
    const [billRows] = await db.query(
      "SELECT * FROM bills WHERE bill_id = ?",
      [bill_id]
    );

    if (billRows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Bill not found" },
        { status: 404 }
      );
    }

    const bill = billRows[0];

    // 2️⃣ Get items for this bill
    const [itemRows] = await db.query(
      `SELECT bi.bill_item_id, bi.medicine_id, bi.quantity, bi.price_at_sale,
              m.name AS medicine_name
       FROM bill_items bi
       JOIN medicines m ON bi.medicine_id = m.medicine_id
       WHERE bi.bill_id = ?`,
      [bill_id]
    );

    return NextResponse.json({
      success: true,
      bill: {
        id: bill.bill_id,
        date: bill.date,
        total_amount: bill.total_amount,
        customer: {
          name: bill.customer_name,
          phone: bill.customer_phone,
          age: bill.customer_age
        },
        items: itemRows.map(item => ({
          id: item.bill_item_id,
          medicine_id: item.medicine_id,
          name: item.medicine_name,
          quantity: item.quantity,
          price_each: item.price_at_sale,
          subtotal: item.price_at_sale * item.quantity
        }))
      }
    });

  } catch (err) {
    console.error("BILL DETAILS API ERROR:", err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
