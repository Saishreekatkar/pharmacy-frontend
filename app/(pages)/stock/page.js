"use client";

import { useState, useEffect } from "react";

export default function StockPage() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Load medicine list
  async function loadMedicines() {
    setLoading(true);
    const res = await fetch("/api/medicines");
    const data = await res.json();
    setMedicines(data.medicines || []);
    setLoading(false);
  }

  useEffect(() => {
    loadMedicines();
  }, []);

  async function uploadCSV(e) {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/medicines/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    alert(data.message);

    setUploading(false);
    loadMedicines();
  }

  return (
    <div className="p-6">

      <h1 className="text-2xl font-bold mb-6">Stock</h1>

      {/* CSV Upload */}
      <div className="mb-6 p-4 bg-white rounded shadow">
        <p className="font-semibold mb-2">Upload Supplier Stock CSV</p>
        <input type="file" accept=".csv" onChange={uploadCSV} />
        {uploading && <p>Uploading...</p>}
      </div>

      {/* Medicines Table */}
      <table className="w-full bg-white rounded shadow">
        <thead>
          <tr className="border-b bg-gray-100">
            <th className="p-3 text-left">ID</th>
            <th className="p-3 text-left">Name</th>
            <th className="p-3 text-left">Price</th>
            <th className="p-3 text-left">Quantity</th>
          </tr>
        </thead>

        <tbody>
  {medicines.map((med) => (
    <tr key={med.medicine_id} className="border-b">
      <td className="p-3">{med.medicine_id}</td>
      <td className="p-3">{med.name}</td>
      <td className="p-3">₹{med.price}</td>
      <td className="p-3">{med.quantity}</td>
    </tr>
  ))}
</tbody>
      </table>
    </div>
  );
}
