import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req) {
  try {
    const body = await req.json();
    const { customer, cart, total, user_id } = body;

    // ---------------------------------------
    // 1️⃣ CHECK IF CUSTOMER EXISTS
    // ---------------------------------------

    const [existing] = await db.query(
      "SELECT * FROM customers WHERE phone = ? OR email = ? LIMIT 1",
      [customer.phone, customer.email]
    );

    let customer_id;

    if (existing.length > 0) {
      customer_id = existing[0].customer_id;
    } else {
      // CREATE NEW CUSTOMER
      const [res] = await db.query(
        "INSERT INTO customers (name, phone, email) VALUES (?, ?, ?)",
        [customer.name, customer.phone, customer.email]
      );
      customer_id = res.insertId;
    }

    // ---------------------------------------
    // 2️⃣ CREATE BILL
    // ---------------------------------------

    const [billRes] = await db.query(
      `INSERT INTO bills (total_amount, customer_name, customer_phone, customer_age, user_id)
       VALUES (?, ?, ?, ?, ?)`,
      [total, customer.name, customer.phone, customer.age || null, user_id || 1] // assuming 1 for now
    );

    const bill_id = billRes.insertId;

    // ---------------------------------------
    // 3️⃣ ADD BILL ITEMS + REDUCE STOCK
    // ---------------------------------------

    for (const item of cart) {
      await db.query(
        `INSERT INTO bill_items (bill_id, medicine_id, quantity, price_at_sale)
         VALUES (?, ?, ?, ?)`,
        [bill_id, item.id, item.quantity, item.price]
      );

      await db.query(
        `UPDATE medicines
         SET quantity = quantity - ?
         WHERE medicine_id = ?`,
        [item.quantity, item.id]
      );
    }

    return NextResponse.json({
      success: true,
      message: "Bill created successfully",
      bill_id,
      customer_id,
    });

  } catch (error) {
    console.error("BILLING ERROR:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
