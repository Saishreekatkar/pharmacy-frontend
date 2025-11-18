import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file uploaded" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const csvText = buffer.toString("utf-8");

    // Parse CSV lines: name,price,quantity
    const lines = csvText
      .trim()
      .split("\n")
      .map((line) => {
        const [name, price, qty] = line.split(",");
        return {
          name: name.trim(),
          price: Number(price),
          quantity: Number(qty),
        };
      });

    for (const item of lines) {
      // Check if medicine exists
      const [existing] = await db.query(
        "SELECT medicine_id, quantity FROM medicines WHERE name = ? LIMIT 1",
        [item.name]
      );

      if (existing.length > 0) {
        // UPDATE existing medicine:
        // Add stock + update price
        await db.query(
          "UPDATE medicines SET price = ?, quantity = quantity + ? WHERE medicine_id = ?",
          [item.price, item.quantity, existing[0].medicine_id]
        );
      } else {
        // INSERT new medicine
        await db.query(
          "INSERT INTO medicines (name, price, quantity) VALUES (?, ?, ?)",
          [item.name, item.price, item.quantity]
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Stock updated (added to existing stock)",
    });
  } catch (err) {
    console.error("CSV UPLOAD ERROR:", err);
    return NextResponse.json(
      { success: false, message: "CSV processing error" },
      { status: 500 }
    );
  }
}
