// app/api/medicines/upload/route.js
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/* Simple CSV parser that supports quoted fields and CRLF/LF.
   Returns array of rows, each row is array of trimmed cell strings.
*/
function parseCsv(text) {
  const rows = [];
  let i = 0, field = "", row = [], inQuotes = false;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"') { inQuotes = true; i++; continue; }
    if (ch === ",") { row.push(field.trim()); field = ""; i++; continue; }
    if (ch === "\r") {
      row.push(field.trim()); field = ""; rows.push(row); row = []; i++;
      if (text[i] === "\n") i++;
      continue;
    }
    if (ch === "\n") { row.push(field.trim()); field = ""; rows.push(row); row = []; i++; continue; }
    field += ch; i++;
  }
  if (field !== "" || row.length > 0) { row.push(field.trim()); rows.push(row); }
  return rows;
}

export async function POST(req) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file) {
      return NextResponse.json({ success: false, message: "No file uploaded (field name 'file')" }, { status: 400 });
    }

    const text = await file.text();

    // remove BOM if present and trim
    const csvText = text.replace(/^\uFEFF/, "").trim();
    if (!csvText) {
      return NextResponse.json({ success: false, message: "Uploaded file is empty" }, { status: 400 });
    }

    const rows = parseCsv(csvText);
    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: false, message: "CSV parsing returned no rows" }, { status: 400 });
    }

    // detect header: look for 'name'/'price'/'quantity'
    let header = rows[0].map(c => (c || "").toLowerCase());
    let dataRows = rows.slice(1);
    const looksLikeHeader =
      (header[0] && header[0].includes("name")) ||
      (header[1] && header[1].includes("price")) ||
      (header[2] && (header[2].includes("qty") || header[2].includes("quantity")));

    if (!looksLikeHeader) {
      // if first row appears to be data (numeric price/qty), include it
      const r0 = rows[0];
      if (r0 && r0.length >= 3 && !isNaN(parseFloat(r0[1])) && !isNaN(parseInt(r0[2], 10))) {
        dataRows = rows; // first row is data
      } else {
        // be permissive — treat all rows as data and validate later
        dataRows = rows;
      }
    }

    // Parse and validate rows
    const parsed = [];
    for (let r of dataRows) {
      if (!r || r.join("").trim() === "") continue;
      const name = (r[0] ?? "").trim();
      const priceRaw = (r[1] ?? "").trim();
      const qtyRaw = (r[2] ?? "").trim();

      if (!name) {
        parsed.push({ ok: false, reason: "missing name", raw: r });
        continue;
      }
      const price = priceRaw === "" ? 0 : Number(priceRaw);
      const quantity = qtyRaw === "" ? 0 : parseInt(qtyRaw, 10);

      if (Number.isNaN(price) || Number.isNaN(quantity)) {
        parsed.push({ ok: false, reason: "invalid price or quantity", raw: r });
        continue;
      }
      parsed.push({ ok: true, name, price, quantity, raw: r });
    }

    if (parsed.length === 0 || parsed.every(p => !p.ok)) {
      return NextResponse.json({ success: false, message: "No valid data rows found", details: parsed }, { status: 400 });
    }

    // DB transaction: update (REPLACE quantity) or insert
    const conn = await db.getConnection();
    const details = [];
    let inserted = 0, updated = 0, skipped = 0;
    try {
      await conn.beginTransaction();

      const namesToCheck = Array.from(new Set(parsed.filter(p => p.ok).map(p => p.name.toLowerCase())));
      let existingRows = [];
      if (namesToCheck.length > 0) {
        const ph = namesToCheck.map(() => "?").join(",");
        const [rowsExist] = await conn.query(
          `SELECT medicine_id, name, price, quantity FROM medicines WHERE LOWER(name) IN (${ph})`,
          namesToCheck
        );
        existingRows = rowsExist || [];
      }
      const existingMap = new Map();
      for (const ex of existingRows) existingMap.set(String(ex.name).toLowerCase(), ex);

      for (const p of parsed) {
        if (!p.ok) { details.push({ ok: false, reason: p.reason, raw: p.raw }); skipped++; continue; }
        const key = p.name.toLowerCase();
        if (existingMap.has(key)) {
          const ex = existingMap.get(key);
          // <-- REPLACE mode: set quantity = CSV quantity (do NOT add)
          const newQty = Number(p.quantity);
          await conn.query(
            `UPDATE medicines SET price = ?, quantity = ? WHERE medicine_id = ?`,
            [p.price, newQty, ex.medicine_id]
          );
          details.push({ ok: true, action: "updated", medicine_id: ex.medicine_id, name: p.name, new_quantity: newQty });
          updated++;
          existingMap.set(key, { ...ex, quantity: newQty });
        } else {
          const [ins] = await conn.query(
            `INSERT INTO medicines (name, price, quantity) VALUES (?, ?, ?)`,
            [p.name, p.price, p.quantity]
          );
          details.push({ ok: true, action: "inserted", medicine_id: ins.insertId, name: p.name, quantity: p.quantity });
          inserted++;
          existingMap.set(key, { medicine_id: ins.insertId, name: p.name, price: p.price, quantity: p.quantity });
        }
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      console.error("MEDICINES CSV UPLOAD DB ERROR:", err);
      return NextResponse.json({ success: false, message: "Database error during insert/update", error: String(err) }, { status: 500 });
    } finally {
      try { conn.release(); } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${parsed.length} rows: inserted ${inserted}, updated ${updated}, skipped ${skipped}`,
      details
    });
  } catch (err) {
    console.error("MEDICINES CSV UPLOAD ERROR:", err);
    return NextResponse.json({ success: false, message: "Server error processing file", error: String(err) }, { status: 500 });
  }
}
