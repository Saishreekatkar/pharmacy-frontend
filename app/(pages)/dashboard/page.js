export default function Dashboard() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <div className="p-4 rounded-lg shadow bg-white">
          <h2 className="text-lg font-semibold">Today's Sales</h2>
          <p className="text-3xl font-bold mt-2">₹0</p>
        </div>

        <div className="p-4 rounded-lg shadow bg-white">
          <h2 className="text-lg font-semibold">Low Stock</h2>
          <p className="mt-2">No data yet</p>
        </div>

        <div className="p-4 rounded-lg shadow bg-white">
          <h2 className="text-lg font-semibold">Total Medicines</h2>
          <p className="mt-2">0 items</p>
        </div>

      </div>
    </div>
  );
}
