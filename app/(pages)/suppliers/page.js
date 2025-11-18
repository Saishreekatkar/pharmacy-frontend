"use client";

import { useEffect, useState } from "react";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => {
    loadSuppliers();
  }, []);

  async function loadSuppliers() {
    const res = await fetch("/api/suppliers");
    const data = await res.json();
    setSuppliers(data.suppliers || []);
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Suppliers</h1>

      <table className="w-full bg-white shadow rounded">
        <thead>
          <tr className="bg-gray-100 border-b">
            <th className="p-3 text-left">ID</th>
            <th className="p-3 text-left">Name</th>
            <th className="p-3 text-left">Contact</th>
          </tr>
        </thead>

        <tbody>
          {suppliers.map((s) => (
            <tr key={s.id} className="border-b">
              <td className="p-3">{s.id}</td>
              <td className="p-3">{s.name}</td>
              <td className="p-3">{s.contact}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
