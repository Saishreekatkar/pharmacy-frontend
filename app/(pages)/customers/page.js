"use client";

import { useEffect, useState } from "react";

/**
 * Clean, minimal Customers page.
 * - Uses the same APIs you already have: /api/customers/list, /api/customers/update, /api/customers/refund
 * - Keeps same behaviour (alerts) so it won't break other parts of your app
 * - Small UX polish: nicer layout, disabled states, loading/empty states, inline form validation
 */

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState(null); // { customer_id, name, phone, email }
  const [busy, setBusy] = useState(false);

  async function loadCustomers() {
    setLoading(true);
    try {
      const res = await fetch("/api/customers/list");
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch (err) {
      console.error("Failed to load customers:", err);
      alert("Failed to load customers from server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  // Open edit modal populated
  function openEdit(c) {
    setEditing({ ...c });
  }

  // Save edit to API
  async function saveEdit() {
    if (!editing || !editing.name?.trim()) {
      alert("Name is required");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/customers/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Update failed");
      } else {
        alert("Customer updated");
        setEditing(null);
        await loadCustomers();
      }
    } catch (err) {
      console.error("Save edit error:", err);
      alert("Server error while updating customer");
    } finally {
      setBusy(false);
    }
  }

  // Refund flow (restore stock, delete bills, delete customer)
  async function refundCustomer(c) {
    if (!confirm(`Refund and delete all bills for ${c.name}? This will restore stock.`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/customers/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: c.customer_id }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Refund failed");
      } else {
        alert("Refund done and customer deleted");
        await loadCustomers();
      }
    } catch (err) {
      console.error("Refund error:", err);
      alert("Server error while processing refund");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Customers</h1>
          <p className="text-sm text-gray-600 mt-1">Manage customers — edit details or refund their bills.</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={loadCustomers}
            className="px-3 py-2 bg-gray-100 border rounded hover:bg-gray-50"
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </header>

      <main>
        <div className="space-y-3">
          {loading ? (
            <div className="p-6 bg-white rounded shadow text-center text-gray-500">Loading customers…</div>
          ) : customers.length === 0 ? (
            <div className="p-6 bg-white rounded shadow text-center text-gray-600">
              No customers yet.
            </div>
          ) : (
            customers.map((c) => (
              <div
                key={c.customer_id}
                className="bg-white shadow rounded p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              >
                <div>
                  <div className="font-medium text-gray-800">{c.name}</div>
                  <div className="text-sm text-gray-500">
                    ID: <span className="font-mono text-xs">{c.customer_id}</span>
                    {" • "}
                    {c.phone || "—"}
                    {c.email ? ` • ${c.email}` : ""}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(c)}
                    className="px-3 py-1 bg-yellow-400 rounded hover:brightness-95"
                    disabled={busy}
                    aria-label={`Edit ${c.name}`}
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => refundCustomer(c)}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:opacity-95"
                    disabled={busy}
                    aria-label={`Refund ${c.name}`}
                  >
                    Refund
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Edit modal (keeps same simple inline style you used) */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white p-5 rounded w-full max-w-md shadow-lg">
            <h2 className="text-lg font-semibold mb-3">Edit Customer</h2>

            <label className="block text-xs text-gray-600 mb-1">Name</label>
            <input
              className="w-full border rounded px-3 py-2 mb-3"
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              placeholder="Full name"
            />

            <label className="block text-xs text-gray-600 mb-1">Phone</label>
            <input
              className="w-full border rounded px-3 py-2 mb-3"
              value={editing.phone || ""}
              onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
              placeholder="Phone number"
            />

            <label className="block text-xs text-gray-600 mb-1">Email</label>
            <input
              className="w-full border rounded px-3 py-2 mb-4"
              value={editing.email || ""}
              onChange={(e) => setEditing({ ...editing, email: e.target.value })}
              placeholder="Email (optional)"
            />

            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-1 border rounded bg-gray-100"
                onClick={() => setEditing(null)}
                disabled={busy}
              >
                Close
              </button>

              <button
                className="px-3 py-1 bg-blue-600 text-white rounded"
                onClick={saveEdit}
                disabled={busy}
              >
                {busy ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
