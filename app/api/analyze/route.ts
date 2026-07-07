import { NextRequest, NextResponse } from "next/server";
import { DEMO_LIMIT, SESSION_COOKIE, SESSION_FULL, USAGE_COOKIE, isValidSession, parseUsageCount } from "@/lib/session";

// Groq handles tone, summary, and Czech reply suggestion only
const GROQ_PROMPT = `You are a business email assistant specializing in international customer support.
The user will send you a business email written in a foreign language.
Respond ONLY with valid JSON (no markdown, no code blocks) with exactly these fields:
- summary: 2-sentence Czech summary of the key points
- tone: one word in English only — one of: formal, urgent, friendly, complaint
- czechReply: a formal professional Czech reply to this email. LANGUAGE: Czech only. FORMATTING: greeting on its own first line, blank line after greeting, body in paragraphs separated by blank lines, closing phrase (e.g. "S pozdravem,") on its own last line. Use **double asterisks** around key phrases, deadlines, or action items.
CRITICAL RULES:
1. "czechReply" must be written entirely in CZECH.
2. Do not add commentary or notes inside any field.
3. The email may contain placeholder tokens like [JMENO_1], [EMAIL_1], [TELEFON_1] standing in for redacted personal data. Copy every such token EXACTLY as-is (same brackets, same text) wherever that information belongs — never translate, alter, or remove them.`;

interface DeeplResult {
  text: string;
  detectedSourceLang: string;
}

async function deeplTranslate(text: string, targetLang: string, apiKey: string): Promise<DeeplResult> {
  // Free keys end with :fx → use api-free subdomain; paid keys use api subdomain
  const isFreeKey = apiKey.endsWith(":fx");
  const endpoint = isFreeKey
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";

  console.log(`[deepl] Translating (auto-detect)→${targetLang} | key length: ${apiKey.length} | free key: ${isFreeKey} | endpoint: ${endpoint}`);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "DeepL-Auth-Key " + apiKey,
    },
    body: JSON.stringify({
      text: [text],
      target_lang: targetLang,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("[deepl] Error response:", JSON.stringify(data));
    throw new Error(data?.message || `DeepL HTTP ${res.status}`);
  }

  const translation = data?.translations?.[0];
  if (!translation?.text) throw new Error("Prázdná odpověď od DeepL.");
  console.log(`[deepl] Done, detected source: ${translation.detected_source_language}`);
  return { text: translation.text, detectedSourceLang: translation.detected_source_language };
}

export async function POST(req: NextRequest) {
  const session = req.cookies.get(SESSION_COOKIE)?.value;
  if (!isValidSession(session)) {
    return NextResponse.json({ error: "Přístup odepřen." }, { status: 401 });
  }
  const unlimited = session === SESSION_FULL;

  const used = parseUsageCount(req.cookies.get(USAGE_COOKIE)?.value);
  if (!unlimited && used >= DEMO_LIMIT) {
    return NextResponse.json({ error: `Demo limit (${DEMO_LIMIT} e-maily) byl vyčerpán.` }, { status: 403 });
  }

  // Trim keys to guard against accidental whitespace/quotes in the saved secret
  const groqKey = process.env.GROQ_API_KEY?.trim();
  const deeplKey = process.env.DEEPL_API_KEY?.trim();

  if (!groqKey) return NextResponse.json({ error: "GROQ_API_KEY není nastaven." }, { status: 500 });
  if (!deeplKey) return NextResponse.json({ error: "DEEPL_API_KEY není nastaven." }, { status: 500 });

  const { email } = await req.json();
  if (!email?.trim()) {
    return NextResponse.json({ error: "Text e-mailu je prázdný." }, { status: 400 });
  }

  console.log("[analyze] Running DeepL translation + Groq analysis in parallel...");

  try {
    // Run DeepL translation and Groq analysis in parallel
    const [deeplResult, groqData] = await Promise.all([
      deeplTranslate(email, "CS", deeplKey),
      fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + groqKey,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: GROQ_PROMPT },
            { role: "user", content: email },
          ],
          response_format: { type: "json_object" },
          max_tokens: 3000,
        }),
      }).then(async (r) => {
        const d = await r.json();
        if (!r.ok) {
          console.error("[groq] Error:", d);
          throw new Error(d?.error?.message || `Groq HTTP ${r.status}`);
        }
        return d;
      }),
    ]);

    const raw = groqData?.choices?.[0]?.message?.content;
    if (!raw) return NextResponse.json({ error: "Prázdná odpověď od Groq." }, { status: 500 });

    const parsed = JSON.parse(raw);
    console.log("[analyze] Done, tone:", parsed.tone);

    const res = NextResponse.json({
      translation: deeplResult.text,
      sourceLang: deeplResult.detectedSourceLang,
      summary: parsed.summary,
      tone: parsed.tone,
      czechReply: parsed.czechReply,
    });
    if (!unlimited) {
      res.cookies.set(USAGE_COOKIE, String(used + 1), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Neočekávaná chyba.";
    console.error("[analyze] Unhandled error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
