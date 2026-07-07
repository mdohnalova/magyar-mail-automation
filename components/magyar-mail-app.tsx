"use client";

import { useState } from "react";
import { DEMO_LIMIT } from "@/lib/session";
import { LANGUAGE_NAMES, languageDisplay } from "@/lib/languages";

const REPLY_LANGUAGE_OPTIONS = Object.entries(LANGUAGE_NAMES)
  .map(([code, { label, flag }]) => ({ code, label, flag }))
  .sort((a, b) => a.label.localeCompare(b.label, "cs"));

// ─── Types ───────────────────────────────────────────────────────────────────

interface AnalysisResult {
  translation: string;
  sourceLang: string;
  summary: string;
  tone: string;
  czechReply: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SAMPLE_EMAIL = `Tisztelt Ügyfélszolgálat!

2024. október 15-én megrendeltem egy laptopot az Önök webáruházából (rendelési szám: HU-2024-8847). A visszaigazolásban 5-7 munkanapot jelöltek meg szállítási határidőként, azonban az azóta eltelt három hét alatt sem kaptam meg a terméket.

Ismételt megkereséseimre az ügyfélszolgálaton nem kaptam érdemi választ, csupán sablonos e-maileket kapok, amelyek szerint „a rendelés feldolgozás alatt áll". Ez teljesen elfogadhatatlan!

Kérem, hogy sürgősen tájékoztassanak a rendelés tényleges állapotáról, és amennyiben a szállítás nem lehetséges a következő 48 órán belül, kérem a vételár azonnali visszatérítését.

Várom mielőbbi válaszukat.

Üdvözlettel,
Horváth András`;

const TONE_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  formal:    { label: "Formální",  bg: "#DBEAFE", text: "#1E3A5F", dot: "#1E3A5F" },
  urgent:    { label: "Urgentní", bg: "#FEE2E2", text: "#B91C1C", dot: "#B91C1C" },
  friendly:  { label: "Přátelský", bg: "#D1FAE5", text: "#065F46", dot: "#059669" },
  complaint: { label: "Stížnost", bg: "#FEF3C7", text: "#92400E", dot: "#D97706" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="mm-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

function stripBoldMarkers(text: string): string {
  return text.replace(/\*\*(.*?)\*\*/g, "$1");
}

function renderFormatted(text: string) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return (
      <span key={i}>
        {parts.map((part, j) =>
          j % 2 === 1 ? <strong key={j}>{part}</strong> : part
        )}
        {i < lines.length - 1 && <br />}
      </span>
    );
  });
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-xl px-5 py-4 text-sm flex items-start gap-3 mm-fade-in"
      style={{ backgroundColor: "#FEE2E2", border: "1px solid #FECACA", color: "#B91C1C" }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5">
        <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
      </svg>
      <div>
        <p className="font-semibold">Chyba</p>
        <p className="mt-0.5 opacity-80">{message}</p>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function MagyarMailApp({ initialRemaining }: { initialRemaining: number }) {
  // Step 1 — analysis
  const [email, setEmail] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(initialRemaining);

  // Step 2 — reply
  const [czechReply, setCzechReply] = useState("");
  const [selectedTone, setSelectedTone] = useState("Formální");
  const [toneLoading, setToneLoading] = useState(false);
  const [toneError, setToneError] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translatedReply, setTranslatedReply] = useState<string | null>(null);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [replyTargetLang, setReplyTargetLang] = useState("");

  // ── Step 1: Analyze ────────────────────────────────────────────────────────

  function loadSample() {
    setEmail(SAMPLE_EMAIL);
    setAnalysis(null);
    setTranslatedReply(null);
    setAnalyzeError(null);
    console.log("[MagyarMail] Loaded sample email");
  }

  async function handleAnalyze() {
    if (!email.trim()) { setAnalyzeError("Vložte prosím text e-mailu."); return; }
    if (remaining <= 0) { setAnalyzeError(`Demo limit (${DEMO_LIMIT} e-maily) byl vyčerpán.`); return; }

    setAnalyzing(true);
    setAnalyzeError(null);
    setAnalysis(null);
    setTranslatedReply(null);
    console.log("[MagyarMail] Calling /api/analyze...");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data: any = {};
      try { data = await res.json(); } catch { /* proxy returned non-JSON */ }
      if (!res.ok) throw new Error((data?.error as string) || `Chyba serveru (HTTP ${res.status})`);

      const parsed: AnalysisResult = data;
      console.log("[MagyarMail] Analysis done, tone:", parsed.tone);
      setAnalysis(parsed);
      setCzechReply(stripBoldMarkers(typeof parsed.czechReply === "string" ? parsed.czechReply : String(parsed.czechReply ?? "")));
      setReplyTargetLang(parsed.sourceLang);
      setRemaining((r) => Math.max(0, r - 1));
    } catch (err) {
      console.error("[MagyarMail] Analyze error:", err);
      setAnalyzeError(err instanceof Error ? err.message : "Neočekávaná chyba.");
    } finally {
      setAnalyzing(false);
    }
  }

  // ── Step 2: Translate reply ────────────────────────────────────────────────

  async function handleTranslateReply() {
    const czechReplyStr = String(czechReply ?? "");
    if (!czechReplyStr.trim()) { setTranslateError("Text odpovědi je prázdný."); return; }
    if (!replyTargetLang) { setTranslateError("Vyberte cílový jazyk odpovědi."); return; }

    setTranslating(true);
    setTranslateError(null);
    setTranslatedReply(null);
    console.log("[MagyarMail] Calling /api/translate-reply...");

    try {
      const res = await fetch("/api/translate-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ czechReply: czechReplyStr, targetLang: replyTargetLang }),
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data: any = {};
      try { data = await res.json(); } catch { /* proxy returned non-JSON */ }
      if (!res.ok) throw new Error((data?.error as string) || `Chyba serveru (HTTP ${res.status})`);

      const translated = data?.translation as string | undefined;
      if (!translated) throw new Error("Prázdná odpověď od AI.");

      console.log("[MagyarMail] Translation done");
      setTranslatedReply(translated);
    } catch (err) {
      console.error("[MagyarMail] Translate error:", err);
      setTranslateError(err instanceof Error ? err.message : "Neočekávaná chyba.");
    } finally {
      setTranslating(false);
    }
  }

  async function handleToneChange(tone: string) {
    if (!email.trim()) return;
    setSelectedTone(tone);
    setToneLoading(true);
    setToneError(null);
    console.log(`[MagyarMail] Regenerating reply with tone: ${tone}`);
    try {
      const res = await fetch("/api/regenerate-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, tone }),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data: any = {};
      try { data = await res.json(); } catch { /* non-JSON */ }
      if (!res.ok) throw new Error((data?.error as string) || `Chyba serveru (HTTP ${res.status})`);
      const reply = data?.czechReply as string | undefined;
      if (!reply) throw new Error("Prázdná odpověď od AI.");
      setCzechReply(stripBoldMarkers(reply));
      console.log(`[MagyarMail] Tone reply done (${reply.length} chars)`);
    } catch (err) {
      console.error("[MagyarMail] Tone error:", err);
      setToneError(err instanceof Error ? err.message : "Neočekávaná chyba.");
    } finally {
      setToneLoading(false);
    }
  }

  async function handleCopy() {
    if (!translatedReply) return;
    try {
      await navigator.clipboard.writeText(translatedReply);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { console.error("[MagyarMail] Copy failed"); }
  }

  // ── Tone ──────────────────────────────────────────────────────────────────

  const toneKey = analysis?.tone?.toLowerCase() ?? "";
  const tone = TONE_CONFIG[toneKey] ?? { label: analysis?.tone ?? "", bg: "#F3F4F6", text: "#374151", dot: "#6B7280" };
  const detectedLang = analysis ? languageDisplay(analysis.sourceLang) : null;
  const replyLang = replyTargetLang ? languageDisplay(replyTargetLang) : detectedLang;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--mm-warm)", fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Header ── */}
      <header style={{ backgroundColor: "white", borderBottom: "1px solid hsl(var(--border))" }} className="sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between py-3 gap-3 flex-wrap">

            {/* Logo */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                style={{ backgroundColor: "var(--mm-red)" }}>MM</div>
              <div>
                <h1 className="font-display text-lg leading-none" style={{ color: "hsl(var(--foreground))" }}>Magyar Mail</h1>
                <p className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>Asistent pro mezinárodní e-mailovou komunikaci</p>
              </div>
            </div>

            <span className="text-xs px-2.5 py-1 rounded-full font-medium shrink-0"
              style={{ backgroundColor: remaining > 0 ? "hsl(var(--secondary))" : "#FEE2E2", color: remaining > 0 ? "hsl(var(--muted-foreground))" : "#B91C1C" }}>
              Demo: zbývá {remaining} z {DEMO_LIMIT} e-mailů
            </span>

          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ── STEP 1: Input ── */}
        <section className="rounded-xl p-5 sm:p-6"
          style={{ backgroundColor: "white", border: "1px solid hsl(var(--border))", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>

          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <label className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
              Krok 1 — Vložte e-mail v cizím jazyce
            </label>
            <button
              onClick={loadSample}
              className="text-xs px-3 py-1.5 rounded-lg font-medium"
              style={{ border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--secondary))", color: "hsl(var(--foreground))" }}
            >
              Načíst ukázkový e-mail
            </button>
          </div>

          <textarea
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Vložte sem obchodní e-mail v cizím jazyce..."
            rows={9}
            className="w-full rounded-lg px-4 py-3 text-sm resize-y outline-none"
            style={{
              border: "1px solid hsl(var(--border))",
              backgroundColor: "hsl(var(--background))",
              color: "hsl(var(--foreground))",
              lineHeight: "1.7",
              fontFamily: "'DM Sans', sans-serif",
            }}
            onFocus={(e) => { e.target.style.borderColor = "var(--mm-red)"; e.target.style.boxShadow = "0 0 0 3px rgba(185,28,28,0.08)"; }}
            onBlur={(e) => { e.target.style.borderColor = "hsl(var(--border))"; e.target.style.boxShadow = "none"; }}
          />

          <div className="flex items-center justify-between mt-3 flex-wrap gap-3">
            <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
              {email.length > 0 ? `${email.length} znaků` : "Zatím žádný text"}
            </span>
            <button
              onClick={handleAnalyze}
              disabled={analyzing || !email.trim() || remaining <= 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: "var(--mm-red)", color: "white", boxShadow: analyzing ? "none" : "0 2px 8px rgba(185,28,28,0.2)" }}
            >
              {analyzing ? <><Spinner /> Analyzuji...</> : <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                Analyzovat e-mail
              </>}
            </button>
          </div>
        </section>

        {analyzeError && <ErrorBox message={analyzeError} />}

        {/* ── STEP 2: Analysis results ── */}
        {analysis && (
          <div className="space-y-4 mm-stagger">

            {/* Tone + Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <div className="rounded-xl p-5 mm-card mm-fade-in"
                style={{ backgroundColor: "white", border: "1px solid hsl(var(--border))", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "hsl(var(--muted-foreground))" }}>
                  Tón e-mailu
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold"
                  style={{ backgroundColor: tone.bg, color: tone.text }}>
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: tone.dot }} />
                  {tone.label || analysis.tone}
                </div>
              </div>

              <div className="rounded-xl p-5 mm-card mm-fade-in"
                style={{ backgroundColor: "white", border: "1px solid hsl(var(--border))", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "hsl(var(--muted-foreground))" }}>
                  Shrnutí
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "hsl(var(--foreground))" }}>{analysis.summary}</p>
              </div>
            </div>

            {/* Translation */}
            <div className="rounded-xl p-5 sm:p-6 mm-card mm-fade-in"
              style={{ backgroundColor: "white", border: "1px solid hsl(var(--border))", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "hsl(var(--muted-foreground))" }}>
                  Překlad e-mailu do češtiny
                </p>
                <span className="text-xs px-2 py-1 rounded-md" style={{ backgroundColor: "hsl(var(--secondary))", color: "hsl(var(--muted-foreground))" }}>
                  {detectedLang?.flag ?? "🌐"} {detectedLang?.label ?? ""} → 🇨🇿 Čeština
                </span>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap"
                style={{ color: "hsl(var(--foreground))", borderLeft: "3px solid var(--mm-red)", paddingLeft: "1rem" }}>
                {analysis.translation}
              </p>
            </div>

            {/* Czech reply editor */}
            <div className="rounded-xl p-5 sm:p-6 mm-fade-in"
              style={{ backgroundColor: "white", border: "1px solid hsl(var(--border))", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>

              <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                  Krok 2 — Upravte českou odpověď
                </p>
                <span className="text-xs px-2 py-1 rounded-md" style={{ backgroundColor: "hsl(var(--secondary))", color: "hsl(var(--muted-foreground))" }}>
                  🇨🇿 Česky
                </span>
              </div>
              <p className="text-xs mb-3" style={{ color: "hsl(var(--muted-foreground))" }}>
                AI navrhla odpověď níže. Upravte ji dle potřeby, pak ji přeložte do zvoleného jazyka.
              </p>

              {/* Reply target language */}
              <div className="mb-3">
                <label className="text-xs font-medium mb-2 block" style={{ color: "hsl(var(--muted-foreground))" }}>
                  Jazyk odpovědi {detectedLang && <>(automaticky {detectedLang.flag} {detectedLang.label} podle příchozího e-mailu, lze změnit):</>}
                </label>
                <select
                  value={replyTargetLang}
                  onChange={(e) => setReplyTargetLang(e.target.value)}
                  className="w-full sm:w-auto rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}
                >
                  {REPLY_LANGUAGE_OPTIONS.map(({ code, label, flag }) => (
                    <option key={code} value={code}>{flag} {label}</option>
                  ))}
                </select>
              </div>

              {/* Tone selector */}
              <div className="mb-3">
                <p className="text-xs font-medium mb-2" style={{ color: "hsl(var(--muted-foreground))" }}>Tón odpovědi:</p>
                <div className="flex flex-wrap gap-2">
                  {["Formální", "Přátelský", "Empatický", "Asertivní"].map((tone) => (
                    <button
                      key={tone}
                      onClick={() => handleToneChange(tone)}
                      disabled={toneLoading}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50 transition-all"
                      style={{
                        backgroundColor: selectedTone === tone ? "var(--mm-red)" : "hsl(var(--secondary))",
                        color: selectedTone === tone ? "white" : "hsl(var(--foreground))",
                        border: "1px solid",
                        borderColor: selectedTone === tone ? "var(--mm-red)" : "hsl(var(--border))",
                      }}
                    >
                      {toneLoading && selectedTone === tone ? <span className="flex items-center gap-1"><Spinner />Generuji...</span> : tone}
                    </button>
                  ))}
                </div>
                {toneError && <p className="text-xs mt-2" style={{ color: "var(--mm-red)" }}>{toneError}</p>}
              </div>

              <textarea
                value={czechReply}
                onChange={(e) => setCzechReply(e.target.value)}
                rows={8}
                className="w-full rounded-lg px-4 py-3 text-sm resize-y outline-none"
                style={{
                  border: "1px solid hsl(var(--border))",
                  backgroundColor: "hsl(var(--background))",
                  color: "hsl(var(--foreground))",
                  lineHeight: "1.7",
                  fontFamily: "'DM Sans', sans-serif",
                }}
                onFocus={(e) => { e.target.style.borderColor = "var(--mm-red)"; e.target.style.boxShadow = "0 0 0 3px rgba(185,28,28,0.08)"; }}
                onBlur={(e) => { e.target.style.borderColor = "hsl(var(--border))"; e.target.style.boxShadow = "none"; }}
              />

              <div className="flex justify-end mt-3">
                <button
                  onClick={handleTranslateReply}
                  disabled={translating || !czechReply.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "#1E3A5F", color: "white", boxShadow: translating ? "none" : "0 2px 8px rgba(30,58,95,0.2)" }}
                >
                  {translating ? <><Spinner /> Překládám...</> : <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="m5 8 6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6" />
                    </svg>
                    Přeložit odpověď zpět ({replyLang?.flag ?? "🌐"} {replyLang?.label ?? "originál"})
                  </>}
                </button>
              </div>
            </div>

            {translateError && <ErrorBox message={translateError} />}

            {/* Translated reply output */}
            {translatedReply && (
              <div className="rounded-xl p-5 sm:p-6 mm-fade-in"
                style={{ backgroundColor: "white", border: "2px solid var(--mm-red)", boxShadow: "0 2px 12px rgba(185,28,28,0.1)" }}>

                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>Odpověď ({replyLang?.flag ?? "🌐"} {replyLang?.label ?? "originál"}) — připravena k odeslání</p>
                    <p className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>Otevřete přímo v e-mailovém klientu nebo zkopírujte text</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`mailto:?body=${encodeURIComponent(translatedReply)}`}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium"
                    style={{
                      backgroundColor: "var(--mm-red)",
                      color: "white",
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                    Otevřít v e-mailovém klientu
                  </a>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium"
                    style={{
                      backgroundColor: copied ? "#D1FAE5" : "hsl(var(--secondary))",
                      color: copied ? "#065F46" : "hsl(var(--foreground))",
                      border: "1px solid",
                      borderColor: copied ? "#6EE7B7" : "hsl(var(--border))",
                    }}
                  >
                    {copied ? (
                      <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg> Zkopírováno!</>
                    ) : (
                      <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg> Kopírovat</>
                    )}
                  </button>
                  </div>
                </div>

                <p className="text-sm leading-relaxed"
                  style={{ color: "hsl(var(--foreground))", borderLeft: "3px solid var(--mm-red)", paddingLeft: "1rem" }}>
                  {renderFormatted(translatedReply ?? "")}
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="max-w-4xl mx-auto px-4 sm:px-6 pb-8 pt-4">
        <p className="text-xs text-center" style={{ color: "hsl(var(--muted-foreground))" }}>
          Magyar Mail · llama-3.3-70b-versatile + DeepL · API volání probíhají na serveru
        </p>
      </footer>
    </div>
  );
}
