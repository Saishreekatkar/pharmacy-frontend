"use client";

import { useEffect, useMemo, useState } from "react";

/* Small helpers */
const rupee = (v) => "₹" + (Number(v || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const parseCsvPreview = (text) => {
  // very small forgiving parser for preview (handles simple CSV with commas and quoted cells)
  const rows = [];
  let i = 0, field = "", row = [], inQuotes = false;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i+1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"') { inQuotes = true; i++; continue; }
    if (ch === ",") { row.push(field.trim()); field = ""; i++; continue; }
    if (ch === "\r") { row.push(field.trim()); field = ""; rows.push(row); row = []; i++; if (text[i] === "\n") i++; continue; }
    if (ch === "\n") { row.push(field.trim()); field = ""; rows.push(row); row = []; i++; continue; }
    field += ch; i++;
  }
  if (field !== "" || row.length > 0) { row.push(field.trim()); rows.push(row); }
  return rows.map(r => r.map(c => (c || "").trim()));
};

export default function StockPage() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success'|'error'|'info', text }
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("name"); // medicine_id | name | price | quantity
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [threshold, setThreshold] = useState(5);

  // Upload preview state
  const [file, setFile] = useState(null);
  const [previewRows, setPreviewRows] = useState(null); // array of [name,price,qty]
  const [previewOpen, setPreviewOpen] = useState(false);

  /* Load medicines */
  async function loadMedicines() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/medicines");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMedicines((data.medicines || []).map(m => ({
        medicine_id: m.medicine_id ?? m.id,
        name: m.name,
        price: Number(m.price),
        quantity: Number(m.quantity ?? 0)
      })));
    } catch (err) {
      console.error("Load medicines error:", err);
      setMessage({ type: "error", text: "Failed to load medicines" });
      setMedicines([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadMedicines(); }, []);

  /* Sorting toggle */
  function toggleSort(key) {
    if (sortKey === key) setSortDir(s => s === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  /* Filter / sort / paginate */
  const filtered = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    let list = medicines.slice();
    if (q) {
      list = list.filter(m =>
        String(m.medicine_id).includes(q) ||
        (m.name || "").toLowerCase().includes(q)
      );
    }
    list.sort((a,b) => {
      let A = a[sortKey], B = b[sortKey];
      if (sortKey === "name") { A = (A||"").toLowerCase(); B = (B||"").toLowerCase(); }
      if (A < B) return sortDir === "asc" ? -1 : 1;
      if (A > B) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [medicines, query, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = useMemo(() => {
    const start = (page - 1) * pageSize; return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  /* CSV preview & upload handlers */
  function onFileSelected(e) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreviewRows(null);
    if (!f) return;
    // quick client-side preview: read first ~100KB or full if small
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const rows = parseCsvPreview(text);
        // show first 200 rows max
        setPreviewRows(rows.slice(0, 200));
        setPreviewOpen(true);
      } catch (err) {
        console.error("CSV parse preview failed:", err);
        setMessage({ type: "error", text: "Failed to parse CSV preview" });
      }
    };
    reader.onerror = () => setMessage({ type: "error", text: "Failed to read file" });
    // read as text
    reader.readAsText(f);
  }

  async function confirmAndUpload(replaceMode = true) {
    // replaceMode ignored here because server side controls how it updates.
    if (!file) { setMessage({ type: "error", text: "No file selected" }); return; }
    setUploading(true);
    setMessage({ type: "info", text: "Uploading CSV..." });
    try {
      const fd = new FormData();
      fd.append("file", file, file.name);
      const res = await fetch("/api/medicines/upload", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({ success: false, message: "Invalid response" }));
      if (!res.ok || !json.success) {
        console.error("Upload error:", json);
        setMessage({ type: "error", text: json.message || "Upload failed" });
      } else {
        setMessage({ type: "success", text: json.message || "Upload successful" });
        // optional: show details in console or message
        console.info("Upload details:", json.details);
        // refresh list
        await loadMedicines();
        setPreviewOpen(false);
        setFile(null);
        setPreviewRows(null);
      }
    } catch (err) {
      console.error("Upload exception:", err);
      setMessage({ type: "error", text: "Upload failed (network or server)" });
    } finally {
      setUploading(false);
    }
  }

  /* UI helpers */
  const lowStockCount = medicines.filter(m => m.quantity <= threshold).length;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <header className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Stock</h1>
          <p className="text-sm text-gray-600 mt-1">Manage medicines — upload supplier CSVs, view stock and spot low items.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right text-sm text-gray-500">
            Low stock: <span className="font-semibold text-red-600">{lowStockCount}</span>
          </div>
        </div>
      </header>

      {/* top controls */}
      <div className="bg-white rounded shadow p-4 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <input
            type="search"
            placeholder="Search by ID or name"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            className="border rounded px-3 py-2 w-72 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Low threshold</label>
            <input type="number" min={0} value={threshold} onChange={(e) => setThreshold(Number(e.target.value || 0))} className="w-20 border rounded px-2 py-1" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600 hidden md:block">Per page</label>
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="border rounded px-2 py-1">
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={30}>30</option>
          </select>

          <div className="relative">
            <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 border rounded bg-white">
              <input type="file" accept=".csv,text/csv" onChange={onFileSelected} className="hidden" />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" viewBox="0 0 20 20" fill="currentColor"><path d="M3 7a1 1 0 011-1h3V4a1 1 0 112 0v2h4V4a1 1 0 112 0v2h3a1 1 0 011 1v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>
              <span className="text-sm">Upload CSV</span>
            </label>
          </div>

          <button onClick={loadMedicines} className="px-3 py-2 bg-gray-100 rounded border">Refresh</button>
        </div>
      </div>

      {/* message */}
      {message && (
        <div className={`mb-4 p-3 rounded ${message.type === "error" ? "bg-red-50 text-red-800" : message.type === "success" ? "bg-green-50 text-green-800" : "bg-indigo-50 text-indigo-800"}`}>
          {message.text}
        </div>
      )}

      {/* table */}
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full table-auto text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="p-3 text-left cursor-pointer" onClick={() => toggleSort("medicine_id")}>ID</th>
              <th className="p-3 text-left cursor-pointer" onClick={() => toggleSort("name")}>Name</th>
              <th className="p-3 text-left cursor-pointer" onClick={() => toggleSort("price")}>Price</th>
              <th className="p-3 text-left cursor-pointer" onClick={() => toggleSort("quantity")}>Quantity</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: pageSize }).map((_, i) => (
                <tr key={i} className="border-t">
                  <td className="p-4"><div className="h-4 w-12 bg-gray-200 animate-pulse rounded" /></td>
                  <td className="p-4"><div className="h-4 w-60 bg-gray-200 animate-pulse rounded" /></td>
                  <td className="p-4"><div className="h-4 w-24 bg-gray-200 animate-pulse rounded" /></td>
                  <td className="p-4"><div className="h-4 w-20 bg-gray-200 animate-pulse rounded" /></td>
                </tr>
              ))
            ) : pageData.length === 0 ? (
              <tr><td colSpan={4} className="p-6 text-center text-gray-600">No medicines found.</td></tr>
            ) : (
              pageData.map(m => {
                const low = m.quantity <= threshold;
                return (
                  <tr key={m.medicine_id} className={`border-t hover:bg-gray-50 ${low ? "bg-red-50" : ""}`}>
                    <td className="p-3">{m.medicine_id}</td>
                    <td className="p-3">
                      <div className="font-medium">{m.name}</div>
                    </td>
                    <td className="p-3">{rupee(m.price)}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-between">
                        <div className={`${low ? "text-red-600 font-semibold" : ""}`}>x{m.quantity}</div>
                        {low && <div className="ml-2 text-xs bg-red-600 text-white rounded px-2 py-0.5">LOW</div>}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* pagination */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing <span className="font-medium">{Math.min((page-1)*pageSize+1, filtered.length)}</span>
          {" - "}
          <span className="font-medium">{Math.min(page*pageSize, filtered.length)}</span>
          {" of "}<span className="font-medium">{filtered.length}</span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => { setPage(1); }} disabled={page===1} className="px-3 py-1 border rounded disabled:opacity-50">First</button>
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
          <div className="px-3 py-1 border rounded">Page {page} / {totalPages}</div>
          <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
          <button onClick={() => setPage(totalPages)} disabled={page===totalPages} className="px-3 py-1 border rounded disabled:opacity-50">Last</button>
        </div>
      </div>

      {/* Upload preview modal */}
      {previewOpen && previewRows && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold">CSV Preview — first {previewRows.length} rows</h3>
                <p className="text-sm text-gray-500">Confirm import. Header `name,price,quantity` is expected.</p>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 border rounded" onClick={() => { setPreviewOpen(false); setFile(null); setPreviewRows(null); }}>Cancel</button>
                <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={() => confirmAndUpload(true)} disabled={uploading}>
                  {uploading ? "Uploading..." : "Confirm & Upload"}
                </button>
              </div>
            </div>

            <div className="overflow-auto max-h-96 border rounded">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Price</th>
                    <th className="p-2 text-left">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((r, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2">{r[0] ?? ""}</td>
                      <td className="p-2">{r[1] ?? ""}</td>
                      <td className="p-2">{r[2] ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 text-xs text-gray-500">Large files will show only the first 200 rows in preview; full file will be uploaded.</div>
          </div>
        </div>
      )}
    </div>
  );
}
