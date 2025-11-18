"use client";

import { useEffect, useState } from "react";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState(null); // { customer_id, name, phone, email }
  const [busy, setBusy] = useState(false);

  async function loadCustomers() {
    setLoading(true);
    try {
      const res = await fetch("/api/customers/list"); // we'll provide a small read API below
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  // Open edit modal
  function openEdit(c) {
    setEditing({ ...c });
  }

  // Call update API
  async function saveEdit() {
    if (!editing || !editing.name) {
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
        loadCustomers();
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    } finally {
      setBusy(false);
    }
  }

  // Refund flow (delete all bills and restore stock + delete customer)
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
        loadCustomers();
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Customers</h1>

      {loading ? <div>Loading...</div> : (
        <div className="space-y-3">
          {customers.length === 0 ? <div>No customers yet.</div> :
            customers.map((c) => (
              <div key={c.customer_id} className="bg-white shadow rounded p-4 flex justify-between items-center">
                <div>
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-sm text-gray-600">{c.phone} • {c.email}</div>
                </div>

                <div className="flex gap-2">
                  <button className="px-3 py-1 bg-yellow-400 rounded" onClick={() => openEdit(c)}>Edit</button>
                  <button className="px-3 py-1 bg-red-600 text-white rounded" onClick={() => refundCustomer(c)}>Refund</button>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* Edit modal (simple inline) */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded w-full max-w-md">
            <h2 className="text-lg font-semibold mb-2">Edit Customer</h2>

            <input className="w-full border p-2 mb-2" value={editing.name}
                   onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            <input className="w-full border p-2 mb-2" value={editing.phone}
                   onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
            <input className="w-full border p-2 mb-2" value={editing.email}
                   onChange={(e) => setEditing({ ...editing, email: e.target.value })} />

            <div className="flex justify-end gap-2 mt-3">
              <button className="px-3 py-1 bg-gray-200 rounded" onClick={() => setEditing(null)} disabled={busy}>Close</button>
              <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={saveEdit} disabled={busy}>
                {busy ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
