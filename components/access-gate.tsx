"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AccessGate() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Nesprávný přístupový kód.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Neočekávaná chyba.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "var(--mm-warm)", fontFamily: "'DM Sans', sans-serif" }}>
      <div className="w-full max-w-sm rounded-xl p-6 sm:p-8" style={{ backgroundColor: "white", border: "1px solid hsl(var(--border))", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: "var(--mm-red)" }}>MM</div>
          <div>
            <h1 className="font-display text-lg leading-none" style={{ color: "hsl(var(--foreground))" }}>Magyar Mail</h1>
            <p className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>Demo verze — přístup na kód</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Zadejte přístupový kód"
            autoFocus
            className="w-full rounded-lg px-4 py-2.5 text-sm outline-none"
            style={{ border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}
          />
          {error && <p className="text-xs" style={{ color: "var(--mm-red)" }}>{error}</p>}
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "var(--mm-red)", color: "white" }}
          >
            {loading ? "Ověřuji..." : "Vstoupit"}
          </button>
        </form>
      </div>
    </div>
  );
}
