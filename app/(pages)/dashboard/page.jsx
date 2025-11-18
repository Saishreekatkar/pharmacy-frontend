"use client";

import { useEffect, useState } from "react";

function rupees(v) {
  return "₹" + Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [threshold, setThreshold] = useState(10);

  async function load(th = threshold) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard?threshold=${encodeURIComponent(th)}`);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`API error ${res.status}: ${txt}`);
      }
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "API returned success: false");
      setData(json);
    } catch (err) {
      console.error("Dashboard load error:", err);
      setError(err.message || "Unknown error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // optionally refresh every X seconds:
    // const t = setInterval(() => load(), 30_000);
    // return () => clearInterval(t);
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">Overview of today’s sales, stock and medicine count.</p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">Low stock threshold</label>
          <input
            type="number"
            min={0}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value || 0))}
            className="w-20 border rounded px-2 py-1"
          />
          <button
            onClick={() => load(threshold)}
            className="px-3 py-1 bg-indigo-600 text-white rounded"
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
        <div className="p-4 rounded-lg shadow bg-white">
          <h2 className="text-sm font-medium text-gray-500">Today's Sales</h2>
          <p className="text-2xl font-bold mt-2">{loading ? "Loading..." : (data ? rupees(data.total_sales_today) : "--")}</p>
          <p className="text-xs text-gray-500 mt-1">{data ? `${data.bills_today} bill(s) today` : ""}</p>
        </div>

        <div className="p-4 rounded-lg shadow bg-white">
          <h2 className="text-sm font-medium text-gray-500">Total Medicines</h2>
          <p className="text-2xl font-bold mt-2">{loading ? "Loading..." : (data ? (data.total_medicines + " items") : "--")}</p>
        </div>

        <div className="p-4 rounded-lg shadow bg-white">
          <h2 className="text-sm font-medium text-gray-500">Low Stock</h2>
          <p className="text-2xl font-bold mt-2">{loading ? "Loading..." : (data ? data.low_stock_count : "--")}</p>
          <p className="text-xs text-gray-500 mt-1">Threshold: {threshold}</p>
        </div>
      </div>

      <div className="bg-white rounded shadow p-4">
        <h3 className="text-lg font-semibold mb-3">Low stock items</h3>

        {loading ? (
          <div className="text-sm text-gray-500">Loading...</div>
        ) : error ? (
          <div className="text-sm text-red-600">Error: {error}</div>
        ) : !data || !data.low_stock || data.low_stock.length === 0 ? (
          <div className="text-sm text-gray-600">No low-stock items (threshold {threshold}).</div>
        ) : (
          <div className="grid gap-2">
            {data.low_stock.map((m) => (
              <div key={m.medicine_id} className="flex items-center justify-between border rounded px-3 py-2">
                <div>
                  <div className="font-medium">{m.name}</div>
                  <div className="text-xs text-gray-500">ID: {m.medicine_id}</div>
                </div>
                <div className="text-sm text-red-600 font-semibold">x{m.quantity}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
