"use client";

import { useEffect, useState, useRef } from "react";

function formatPrice(v) {
  return Number(v || 0).toFixed(2);
}

export default function BillingPage() {
  const [customer, setCustomer] = useState({ name: "", phone: "", email: "", age: "" });
  const [medicines, setMedicines] = useState([]);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [suggestQty, setSuggestQty] = useState({}); // qty for each suggestion input
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const suggRef = useRef(null);
  const inputRef = useRef(null);

  // Load medicines
  useEffect(() => {
    fetch("/api/medicines")
      .then((r) => r.json())
      .then((data) => {
        const list = (data.medicines || []).map((m) => ({
          medicine_id: m.medicine_id ?? m.id,
          name: m.name,
          price: Number(m.price),
          quantity: Number(m.quantity ?? 0),
        }));
        setMedicines(list);
      })
      .catch((err) => console.error("Could not load medicines:", err));
  }, []);

  // Suggestions derived from query
  useEffect(() => {
    if (!query) {
      setSuggestions([]);
      return;
    }
    const q = query.toLowerCase().trim();
    if (!q) return setSuggestions([]);
    const found = medicines
      .filter((m) => m.name.toLowerCase().includes(q))
      .slice(0, 8);
    setSuggestions(found);
    // initialize qtys to 1 for suggestions
    const init = {};
    found.forEach((s) => { init[s.medicine_id] = 1; });
    setSuggestQty((prev) => ({ ...init, ...prev }));
  }, [query, medicines]);

  // Outside click closes suggestions
  useEffect(() => {
    function handler(e) {
      if (suggRef.current && !suggRef.current.contains(e.target)) setSuggestions([]);
    }
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // Add item to cart
  function addToCart(med, qty = 1) {
    if (!med) return;
    qty = Math.max(1, Math.trunc(Number(qty) || 1));
    if (qty > med.quantity) {
      alert(`Only ${med.quantity} left in stock for ${med.name}`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((c) => c.medicine_id === med.medicine_id);
      if (existing) {
        const newQty = existing.quantity + qty;
        if (newQty > med.quantity) {
          alert(`Only ${med.quantity} left in stock for ${med.name}`);
          return prev;
        }
        return prev.map((c) => (c.medicine_id === med.medicine_id ? { ...c, quantity: newQty } : c));
      } else {
        return [...prev, { ...med, quantity: qty }];
      }
    });
    setQuery("");
    setSuggestions([]);
    inputRef.current?.focus();
  }

  function updateQty(id, qty) {
    qty = Math.max(1, Math.trunc(Number(qty) || 1));
    const med = medicines.find((m) => m.medicine_id === id);
    if (!med) return;
    if (qty > med.quantity) {
      alert(`Only ${med.quantity} left in stock for ${med.name}`);
      return;
    }
    setCart((prev) => prev.map((c) => (c.medicine_id === id ? { ...c, quantity: qty } : c)));
  }

  function removeFromCart(id) {
    setCart((prev) => prev.filter((c) => c.medicine_id !== id));
  }

  const total = cart.reduce((s, it) => s + it.price * it.quantity, 0);

  // Create Bill (called after confirmation)
  async function handleCreateBill() {
    if (!customer.name || !customer.phone) {
      alert("Customer name and phone are required.");
      return;
    }
    if (cart.length === 0) {
      alert("Cart is empty.");
      return;
    }

    const payload = {
      customer: {
        name: customer.name,
        phone: customer.phone,
        email: customer.email || null,
        age: customer.age ? Number(customer.age) : null,
      },
      cart: cart.map((c) => ({ id: c.medicine_id, quantity: c.quantity, price: c.price })),
      total,
      user_id: 1,
    };

    setCreating(true);
    try {
      const res = await fetch("/api/billing/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Failed to generate bill");
        setCreating(false);
        return;
      }
      alert(`Bill #${data.bill_id} created — Total ₹${formatPrice(total)}`);
      // refresh medicines stock
      const fresh = await (await fetch("/api/medicines")).json();
      setMedicines((fresh.medicines || []).map((m) => ({
        medicine_id: m.medicine_id ?? m.id,
        name: m.name,
        price: Number(m.price),
        quantity: Number(m.quantity),
      })));
      // reset
      setCustomer({ name: "", phone: "", email: "", age: "" });
      setCart([]);
      setConfirmOpen(false);
    } catch (err) {
      console.error(err);
      alert("Server error creating bill.");
    }
    setCreating(false);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-extrabold">Create New Bill</h1>
          <p className="text-sm text-gray-600 mt-1">Fast billing — search medicines, adjust quantities, and generate bills.</p>
        </div>
        <div className="text-right text-sm text-gray-500">Today · <span>{new Date().toLocaleString()}</span></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Customer + Search */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer card */}
          <div className="bg-white shadow rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">Customer</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input className="border rounded px-3 py-2" placeholder="Name" value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
              <input className="border rounded px-3 py-2" placeholder="Phone" value={customer.phone}
                onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
              <input className="border rounded px-3 py-2" placeholder="Email" value={customer.email}
                onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
              <input className="border rounded px-3 py-2" placeholder="Age" value={customer.age}
                onChange={(e) => setCustomer({ ...customer, age: e.target.value })} />
            </div>
          </div>

          {/* Search & suggestions */}
          <div className="bg-white shadow rounded-lg p-4" ref={suggRef}>
            <h2 className="text-lg font-semibold mb-3">Add Medicines</h2>
            <div className="relative">
              <input
                ref={inputRef}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="Search medicine by name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />

              {suggestions.length > 0 && (
                <ul className="absolute left-0 right-0 bg-white border mt-2 max-h-64 overflow-auto z-50 rounded shadow">
                  {suggestions.map((s) => (
                    <li key={s.medicine_id} className="p-3 flex items-center justify-between gap-3 hover:bg-gray-50">
                      <div>
                        <div className="font-medium">{s.name}</div>
                        <div className="text-sm text-gray-500">₹{formatPrice(s.price)} • In stock: {s.quantity}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          value={suggestQty[s.medicine_id] ?? 1}
                          onChange={(e) => setSuggestQty(prev => ({ ...prev, [s.medicine_id]: Number(e.target.value || 1) }))}
                          className="w-20 border rounded px-2 py-1"
                          aria-label={`Qty for ${s.name}`}
                        />
                        <button
                          className="bg-indigo-600 text-white px-3 py-1 rounded"
                          onClick={() => addToCart(s, suggestQty[s.medicine_id] ?? 1)}
                        >
                          Add
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Cart (compact on mobile) */}
          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Cart</h2>
              <div className="text-sm text-gray-500">{cart.length} item(s)</div>
            </div>

            {cart.length === 0 ? (
              <div className="text-gray-600">No items added — search or select medicines to add them here.</div>
            ) : (
              <div className="space-y-3">
                {cart.map((c) => (
                  <div key={c.medicine_id} className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-gray-500">₹{formatPrice(c.price)} each</div>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        value={c.quantity}
                        onChange={(e) => updateQty(c.medicine_id, Number(e.target.value || 1))}
                        className="w-20 border rounded px-2 py-1 text-right"
                      />
                      <div className="w-28 text-right font-medium">₹{formatPrice(c.price * c.quantity)}</div>
                      <button className="text-sm text-red-600" onClick={() => removeFromCart(c.medicine_id)}>Remove</button>
                    </div>
                  </div>
                ))}

                <div className="pt-3 border-t flex items-center justify-between">
                  <div className="text-lg font-semibold">Total</div>
                  <div className="text-2xl font-extrabold">₹{formatPrice(total)}</div>
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    className="bg-gray-100 text-gray-800 py-2 rounded border"
                    onClick={() => { setCart([]); }}
                    disabled={creating}
                  >
                    Clear Cart
                  </button>
                  <button
                    className="bg-green-600 text-white py-2 rounded col-span-2"
                    onClick={() => setConfirmOpen(true)}
                    disabled={creating}
                  >
                    {creating ? "Processing…" : "Proceed to Create Bill"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column: quick stock list + recent medicines */}
        <aside className="space-y-6">
          <div className="bg-white shadow rounded-lg p-4">
            <h3 className="text-md font-semibold mb-2">Quick Stock</h3>
            <div className="grid gap-2 max-h-64 overflow-auto">
              {medicines.slice(0, 8).map((m) => (
                <div key={m.medicine_id} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-medium text-sm">{m.name}</div>
                    <div className="text-xs text-gray-500">₹{formatPrice(m.price)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-gray-600">x{m.quantity}</div>
                    <button className="text-xs bg-indigo-600 text-white px-2 py-1 rounded" onClick={() => addToCart(m, 1)}>Add</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-4 text-sm text-gray-600">
            <div className="font-semibold mb-1">Tips</div>
            <ul className="list-disc pl-5 space-y-1">
              <li>Search medicines by name and add quickly.</li>
              <li>Quantities are validated against stock.</li>
              <li>Customer name & phone are required for billing.</li>
            </ul>
          </div>
        </aside>
      </div>

      {/* Confirm modal (simple) */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-2">Confirm Bill</h3>
            <p className="text-sm text-gray-600 mb-4">Please confirm customer details and total before creating the bill.</p>

            <div className="grid grid-cols-1 gap-2 mb-4">
              <div><span className="text-xs text-gray-500">Customer</span><div className="font-medium">{customer.name || "—"}</div></div>
              <div><span className="text-xs text-gray-500">Phone</span><div className="font-medium">{customer.phone || "—"}</div></div>
              <div><span className="text-xs text-gray-500">Items</span>
                <div className="mt-2 space-y-1 max-h-40 overflow-auto">
                  {cart.map(c => (
                    <div key={c.medicine_id} className="flex justify-between text-sm">
                      <div>{c.name} <span className="text-gray-500">x{c.quantity}</span></div>
                      <div>₹{formatPrice(c.price * c.quantity)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="text-xl font-bold">Total: ₹{formatPrice(total)}</div>
              <div className="flex gap-2">
                <button className="px-4 py-2 rounded border" onClick={() => setConfirmOpen(false)} disabled={creating}>Cancel</button>
                <button className="px-4 py-2 bg-green-600 text-white rounded" onClick={handleCreateBill} disabled={creating}>
                  {creating ? "Creating…" : "Create Bill"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
