"use client";

import { useEffect, useState } from "react";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSuppliers();
  }, []);

  async function loadSuppliers() {
    setLoading(true);
    try {
      const res = await fetch("/api/suppliers", { cache: "no-store" });
      const data = await res.json();
      setSuppliers(data.suppliers || []);
    } catch (err) {
      console.error("Failed to load suppliers:", err);
      alert("Error loading suppliers");
    }
    setLoading(false);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Suppliers</h1>
          <p className="text-sm text-gray-600 mt-1">
            View and manage all medicine suppliers.
          </p>
        </div>

        <button
          onClick={loadSuppliers}
          className="px-3 py-2 bg-gray-100 border rounded hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {/* CARD TABLE */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 border-b">
            <tr>
              <th className="p-3 text-left">ID</th>
              <th className="p-3 text-left">Supplier Name</th>
              <th className="p-3 text-left">Contact</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              // loading skeletons
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b">
                  <td className="p-3">
                    <div className="h-4 w-10 bg-gray-200 animate-pulse rounded" />
                  </td>
                  <td className="p-3">
                    <div className="h-4 w-40 bg-gray-200 animate-pulse rounded" />
                  </td>
                  <td className="p-3">
                    <div className="h-4 w-32 bg-gray-200 animate-pulse rounded" />
                  </td>
                </tr>
              ))
            ) : suppliers.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="p-6 text-center text-gray-600 italic"
                >
                  No suppliers found.
                </td>
              </tr>
            ) : (
              suppliers.map((s) => (
                <tr
                  key={s.id}
                  className="border-b hover:bg-gray-50 transition"
                >
                  <td className="p-3">{s.id}</td>
                  <td className="p-3 font-medium">{s.name}</td>
                  <td className="p-3 text-gray-700">{s.contact || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
