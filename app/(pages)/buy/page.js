"use client";

import { useEffect, useState, useRef } from "react";

function formatPrice(v) {
  return Number(v).toFixed(2);
}

export default function BillingPage() {
  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    age: "",
  });

  const [medicines, setMedicines] = useState([]);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const suggRef = useRef(null);

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

  // Search suggestion logic
  useEffect(() => {
    if (!query) return setSuggestions([]);
    const q = query.toLowerCase();
    const found = medicines.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 8);
    setSuggestions(found);
  }, [query, medicines]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handler(e) {
      if (suggRef.current && !suggRef.current.contains(e.target)) {
        setSuggestions([]);
      }
    }
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // Add item to cart
  function addToCart(med, qty = 1) {
    if (!med) return;

    if (qty > med.quantity) {
      alert(`Only ${med.quantity} left in stock for ${med.name}`);
      return;
    }

    const existing = cart.find((c) => c.medicine_id === med.medicine_id);

    if (existing) {
      const newQty = existing.quantity + qty;
      if (newQty > med.quantity) {
        alert(`Only ${med.quantity} left in stock for ${med.name}`);
        return;
      }
      setCart(cart.map((c) => (c.medicine_id === med.medicine_id ? { ...c, quantity: newQty } : c)));
    } else {
      setCart([...cart, { ...med, quantity: qty }]);
    }

    setQuery("");
    setSuggestions([]);
  }

  // Update quantity
  function updateQty(id, qty) {
    if (qty < 1) return;
    const med = medicines.find((m) => m.medicine_id === id);
    if (!med) return;

    if (qty > med.quantity) {
      alert(`Only ${med.quantity} left in stock for ${med.name}`);
      return;
    }
    setCart(cart.map((c) => (c.medicine_id === id ? { ...c, quantity: qty } : c)));
  }

  // Remove item
  function removeFromCart(id) {
    setCart(cart.filter((c) => c.medicine_id !== id));
  }

  const total = cart.reduce((s, it) => s + it.price * it.quantity, 0);

  // Create Bill
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
      cart: cart.map((c) => ({
        id: c.medicine_id,
        quantity: c.quantity,
        price: c.price,
      })),
      total,
      user_id: 1,
    };

    setLoading(true);

    try {
      const res = await fetch("/api/billing/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to generate bill");
        setLoading(false);
        return;
      }

      alert(`Bill #${data.bill_id} created successfully! Total ₹${formatPrice(total)}`);

      // Reload updated stock
      const fresh = await (await fetch("/api/medicines")).json();
      setMedicines(
        (fresh.medicines || []).map((m) => ({
          medicine_id: m.medicine_id ?? m.id,
          name: m.name,
          price: Number(m.price),
          quantity: Number(m.quantity),
        }))
      );

      // Reset
      setCustomer({ name: "", phone: "", email: "", age: "" });
      setCart([]);

    } catch (err) {
      console.error(err);
      alert("Server error creating bill.");
    }

    setLoading(false);
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Create New Bill</h1>

      {/* CUSTOMER */}
      <div className="bg-white rounded shadow p-4 max-w-2xl mb-6">
        <h2 className="text-lg font-semibold mb-3">Customer Details</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input className="border p-2" placeholder="Name"
            value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
          <input className="border p-2" placeholder="Phone"
            value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
          <input className="border p-2" placeholder="Email"
            value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
          <input className="border p-2" placeholder="Age"
            value={customer.age} onChange={(e) => setCustomer({ ...customer, age: e.target.value })} />
        </div>
      </div>

      {/* SEARCH */}
      <div className="bg-white rounded shadow p-4 max-w-2xl mb-6">
        <h2 className="text-lg font-semibold mb-3">Add Medicines</h2>

        <div className="relative" ref={suggRef}>
          <input
            className="w-full border p-2"
            placeholder="Search medicine..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          {suggestions.length > 0 && (
            <ul className="absolute left-0 right-0 bg-white border mt-1 max-h-48 overflow-auto z-50">
              {suggestions.map((s) => (
                <li key={s.medicine_id} className="p-2 hover:bg-gray-100 flex justify-between items-center">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-sm text-gray-600">
                      ₹{formatPrice(s.price)} • Qty: {s.quantity}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      defaultValue="1"
                      max={s.quantity}
                      className="w-20 border p-1"
                      id={`qty-${s.medicine_id}`}
                    />

                    <button
                      className="bg-blue-600 text-white px-3 py-1 rounded"
                      onClick={() => {
                        const val = Number(document.getElementById(`qty-${s.medicine_id}`).value || 1);
                        addToCart(s, val);
                      }}
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

      {/* CART */}
      <div className="bg-white rounded shadow p-4 max-w-2xl mb-6">
        <h2 className="text-lg font-semibold mb-3">Cart</h2>

        {cart.length === 0 ? (
          <div className="text-gray-600">Search and add medicines to cart.</div>
        ) : (
          <>
            <div className="space-y-3">
              {cart.map((c) => (
                <div key={c.medicine_id} className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-sm text-gray-600">
                      ₹{formatPrice(c.price)} each
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      className="w-20 border p-1"
                      value={c.quantity}
                      onChange={(e) => updateQty(c.medicine_id, Number(e.target.value))}
                    />
                    <div className="w-24 text-right">
                      ₹{formatPrice(c.price * c.quantity)}
                    </div>
                    <button className="text-red-600" onClick={() => removeFromCart(c.medicine_id)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-3 border-t mt-4">
              <div className="text-lg font-semibold">Total</div>
              <div className="text-xl font-bold">₹{formatPrice(total)}</div>
            </div>

            <button
              onClick={handleCreateBill}
              className="bg-green-600 text-white w-full py-2 mt-4 rounded"
              disabled={loading}
            >
              {loading ? "Generating Bill..." : "Generate Bill"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
