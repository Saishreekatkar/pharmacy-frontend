"use client";

import { useEffect, useState } from "react";

export default function BillsPage() {
  const [bills, setBills] = useState([]);

  useEffect(() => {
    loadBills();
  }, []);

  async function loadBills() {
    const res = await fetch("/api/bills");
    const data = await res.json();
    setBills(data.bills || []);
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Bill History</h1>
<table className="w-full bg-white shadow rounded">
  <thead>
    <tr className="bg-gray-100 border-b">
      <th className="p-3 text-left">Bill ID</th>
      <th className="p-3 text-left">Customer</th>   {/* 👈 new column */}
      <th className="p-3 text-left">Total</th>
      <th className="p-3 text-left">Date</th>
    </tr>
  </thead>

  <tbody>
    {bills.map((b) => (
      <tr key={b.id} className="border-b">
        <td className="p-3">{b.id}</td>
        <td className="p-3">{b.customer_name || "N/A"}</td> {/* 👈 show name */}
        <td className="p-3">₹{b.total}</td>
        <td className="p-3">{new Date(b.date).toLocaleString()}</td>
      </tr>
    ))}
  </tbody>
</table>

    </div>
  );
}
