"use client";

import { useEffect, useMemo, useState } from "react";

export default function BillsPage() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [selected, setSelected] = useState(null); // bill selected for modal

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/bills");
        const data = await res.json();
        if (!mounted) return;
        setBills(data.bills || []);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return bills.slice();
    return bills.filter(b => {
      return String(b.id).includes(q) ||
             (b.customer_name || "").toLowerCase().includes(q) ||
             (b.customer_phone || "").toLowerCase().includes(q);
    });
  }, [bills, query]);

  const sorted = useMemo(() => {
    const list = filtered.slice();
    list.sort((a,b) => {
      let A = a[sortKey];
      let B = b[sortKey];
      if (sortKey === 'date') {
        A = new Date(A).getTime();
        B = new Date(B).getTime();
      }
      if (A < B) return sortDir === 'asc' ? -1 : 1;
      if (A > B) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold">Bill History</h1>
          <p className="text-sm text-gray-600 mt-1">Recent bills, searchable and paginated. Your data is read-only here.</p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            placeholder="Search by bill id, customer name or phone"
            className="border rounded-md px-3 py-2 w-72 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Per page</label>
            <select value={pageSize} onChange={(e)=>{ setPageSize(parseInt(e.target.value,10)); setPage(1); }} className="border rounded-md px-2 py-1">
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>
        </div>
      </header>

      <main>
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="w-full table-auto">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 cursor-pointer" onClick={()=>toggleSort('id')}>Bill ID</th>
                <th className="text-left p-3 cursor-pointer" onClick={()=>toggleSort('customer_name')}>Customer</th>
                <th className="text-left p-3 cursor-pointer" onClick={()=>toggleSort('total')}>Total</th>
                <th className="text-left p-3 cursor-pointer" onClick={()=>toggleSort('date')}>Date</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                // skeleton rows
                Array.from({length: pageSize}).map((_,i) => (
                  <tr key={i} className="border-t">
                    <td className="p-4"><div className="h-4 bg-gray-200 rounded w-20 animate-pulse" /></td>
                    <td className="p-4"><div className="h-4 bg-gray-200 rounded w-40 animate-pulse" /></td>
                    <td className="p-4"><div className="h-4 bg-gray-200 rounded w-24 animate-pulse" /></td>
                    <td className="p-4"><div className="h-4 bg-gray-200 rounded w-36 animate-pulse" /></td>
                    <td className="p-4"><div className="h-8 bg-gray-200 rounded w-24 animate-pulse" /></td>
                  </tr>
                ))
              ) : paged.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-gray-600">No bills found.</td></tr>
              ) : (
                paged.map((b) => (
                  <tr key={b.id} className="border-t hover:bg-gray-50">
                    <td className="p-4 font-medium">{b.id}</td>
                    <td className="p-4">
                      <div className="text-sm font-semibold">{b.customer_name || 'Walk-in'}</div>
                      <div className="text-xs text-gray-500">{b.customer_phone || '-'}</div>
                    </td>
                    <td className="p-4">₹{Number(b.total).toFixed(2)}</td>
                    <td className="p-4 text-sm text-gray-600">{new Date(b.date).toLocaleString()}</td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button onClick={()=>setSelected(b)} className="px-3 py-1 bg-white border rounded shadow-sm text-sm hover:bg-gray-50">View</button>
                        <button onClick={async ()=>{
                          if(!confirm('Refund this bill and restore stock?')) return;
                          try{
                            const res = await fetch('/api/customers/refund',{ method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ customer_id: b.customer?.id || null }) });
                            const data = await res.json();
                            alert(data.message || 'Refund attempted');
                          }catch(e){ console.error(e); alert('Server error'); }
                        }} className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:opacity-95">Refund</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* footer / pagination */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">Showing <span className="font-medium">{(page-1)*pageSize + (paged.length ? 1 : 0)}</span> - <span className="font-medium">{(page-1)*pageSize + paged.length}</span> of <span className="font-medium">{sorted.length}</span></div>

          <div className="flex items-center gap-2">
            <button onClick={()=>setPage(1)} disabled={page===1} className="px-3 py-1 border rounded disabled:opacity-50">First</button>
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
            <div className="px-3 py-1 border rounded">Page {page} / {totalPages}</div>
            <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
            <button onClick={()=>setPage(totalPages)} disabled={page===totalPages} className="px-3 py-1 border rounded disabled:opacity-50">Last</button>
          </div>
        </div>
      </main>

      {/* Modal: bill details */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold">Bill #{selected.id}</h2>
                <p className="text-sm text-gray-600">{selected.customer_name || 'Walk-in'} • {selected.customer_phone || '-'}</p>
              </div>
              <button onClick={()=>setSelected(null)} className="text-gray-500 hover:text-gray-800">Close</button>
            </div>

            <div className="mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500">Total</div>
                  <div className="font-medium">₹{Number(selected.total).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Date</div>
                  <div className="font-medium">{new Date(selected.date).toLocaleString()}</div>
                </div>
              </div>

              
            </div>

            <div className="mt-6 flex justify-end">
              <button onClick={()=>setSelected(null)} className="px-4 py-2 bg-gray-100 rounded mr-2">Close</button>
              <button onClick={()=>alert('Open refund flow from modal (implement)')} className="px-4 py-2 bg-red-600 text-white rounded">Refund</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
