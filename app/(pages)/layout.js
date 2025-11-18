import Link from "next/link";

export default function PagesLayout({ children }) {
  return (
    <div className="min-h-screen flex">

      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white p-5">
        <h1 className="text-2xl font-bold mb-6">Pharmacy</h1>

        <nav className="space-y-3">
          <Link href="/dashboard" className="block p-2 hover:bg-gray-800 rounded">
            Dashboard
          </Link>

          <Link href="/buy" className="block p-2 hover:bg-gray-800 rounded">
            Buy / Billing
          </Link>

          <Link href="/stock" className="block p-2 hover:bg-gray-800 rounded">
            Stock
          </Link>

          <Link href="/suppliers" className="block p-2 hover:bg-gray-800 rounded">
            Suppliers
          </Link>

          <Link href="/customers" className="block p-2 hover:bg-gray-800 rounded">
            Customers
          </Link>

          <Link href="/bills" className="block p-2 hover:bg-gray-800 rounded">
            Bills
          </Link>

          <Link href="/login" className="block p-2 mt-6 bg-red-600 hover:bg-red-700 rounded">
            Logout
          </Link>
        </nav>
      </aside>

      {/* Main Page */}
      <main className="flex-1 bg-gray-100">{children}</main>

    </div>
  );
}
