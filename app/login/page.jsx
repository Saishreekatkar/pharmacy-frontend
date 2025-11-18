// app/auth/page.jsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();

  // login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // register supplier
  const [sName, setSName] = useState("");
  const [sContact, setSContact] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerMsg, setRegisterMsg] = useState(null); // { type, text }

  async function handleLogin(e) {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        // redirect to dashboard (or whatever)
        router.push("/dashboard");
      } else {
        alert(data.message || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      alert("Server error during login");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setRegisterMsg(null);

    const name = (sName || "").trim();
    const contact = (sContact || "").trim();

    if (!name) {
      setRegisterMsg({ type: "error", text: "Supplier name is required." });
      return;
    }
    if (!contact) {
      setRegisterMsg({ type: "error", text: "Contact (email or phone) is required." });
      return;
    }

    setRegisterLoading(true);
    try {
      const res = await fetch("/api/suppliers/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contact }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRegisterMsg({ type: "error", text: json.message || "Failed to create supplier." });
      } else {
        setRegisterMsg({ type: "success", text: `Supplier created (id ${json.id})` });
        // reset fields
        setSName("");
        setSContact("");
      }
    } catch (err) {
      console.error("Register supplier error:", err);
      setRegisterMsg({ type: "error", text: "Server error while creating supplier." });
    } finally {
      setRegisterLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Login card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-2">Sign in</h2>
          <p className="text-sm text-gray-500 mb-4">Sign in to access the dashboard.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <label className="block">
              <span className="text-sm text-gray-600">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full border rounded px-3 py-2 focus:ring-2 focus:ring-indigo-400"
                placeholder="you@example.com"
              />
            </label>

            <label className="block">
              <span className="text-sm text-gray-600">Password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full border rounded px-3 py-2 focus:ring-2 focus:ring-indigo-400"
                placeholder="••••••••"
              />
            </label>

            <div className="flex items-center justify-between">
              <button
                type="submit"
                disabled={loginLoading}
                className={`px-4 py-2 rounded text-white ${loginLoading ? "bg-indigo-300" : "bg-indigo-600 hover:bg-indigo-700"}`}
              >
                {loginLoading ? "Signing in…" : "Sign in"}
              </button>

              <button
                type="button"
                className="text-sm text-gray-600 hover:underline"
                onClick={() => alert("Forgot password flow not implemented (use back-end)")}
              >
                Forgot password?
              </button>
            </div>
          </form>
        </div>

        {/* Register supplier card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-2">Register supplier</h2>
          <p className="text-sm text-gray-500 mb-4">Add a supplier (name + contact). This creates a suppliers row in the DB.</p>

          {registerMsg && (
            <div className={`mb-3 p-3 rounded ${registerMsg.type === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-800"}`}>
              {registerMsg.text}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-3">
            <label className="block">
              <span className="text-sm text-gray-600">Supplier name</span>
              <input
                type="text"
                required
                value={sName}
                onChange={(e) => setSName(e.target.value)}
                placeholder="Supplier Pvt Ltd"
                className="mt-1 block w-full border rounded px-3 py-2 focus:ring-2 focus:ring-indigo-400"
              />
            </label>

            <label className="block">
              <span className="text-sm text-gray-600">Contact (email or phone)</span>
              <input
                type="text"
                required
                value={sContact}
                onChange={(e) => setSContact(e.target.value)}
                placeholder="supplier@example.com or 9123456789"
                className="mt-1 block w-full border rounded px-3 py-2 focus:ring-2 focus:ring-indigo-400"
              />
            </label>

            <div className="flex items-center justify-end gap-2">
              <button
                type="submit"
                disabled={registerLoading}
                className={`px-4 py-2 rounded text-white ${registerLoading ? "bg-green-300" : "bg-green-600 hover:bg-green-700"}`}
              >
                {registerLoading ? "Creating…" : "Create supplier"}
              </button>
            </div>
          </form>

          <p className="text-xs text-gray-400 mt-4">Tip: You can add suppliers here, then upload supplier CSVs in the Stock page and assign purchases to suppliers if needed.</p>
        </div>
      </div>
    </div>
  );
}
