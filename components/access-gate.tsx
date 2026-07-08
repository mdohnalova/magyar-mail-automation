"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "demo" | "full";

export function AccessGate() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("demo");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Nesprávné jméno nebo heslo.");
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
            <p className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>Přihlášení</p>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex rounded-lg p-1 mb-4" style={{ backgroundColor: "hsl(var(--secondary))" }}>
          {(["demo", "full"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className="flex-1 text-sm font-medium rounded-md py-1.5 transition-colors"
              style={{
                backgroundColor: mode === m ? "white" : "transparent",
                color: mode === m ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {m === "demo" ? "Demo" : "Plný přístup"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Uživatelské jméno"
            autoFocus
            autoComplete="username"
            className="w-full rounded-lg px-4 py-2.5 text-sm outline-none"
            style={{ border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Heslo"
            autoComplete="current-password"
            className="w-full rounded-lg px-4 py-2.5 text-sm outline-none"
            style={{ border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}
          />
          {error && <p className="text-xs" style={{ color: "var(--mm-red)" }}>{error}</p>}
          <button
            type="submit"
            disabled={loading || !username.trim() || !password.trim()}
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
