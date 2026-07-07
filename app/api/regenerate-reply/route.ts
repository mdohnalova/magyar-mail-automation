import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

const TONE_INSTRUCTIONS: Record<string, string> = {
  Formální:   "Write in a formal, professional tone. Use polite forms of address, avoid contractions, maintain respectful distance.",
  Přátelský:  "Write in a warm, friendly tone. Be approachable and personable while still professional.",
  Empatický:  "Write in an empathetic, understanding tone. Acknowledge the sender's feelings and concerns, show genuine care.",
  Asertivní:  "Write in a confident, assertive tone. Be direct and clear about positions and next steps, avoid vague language.",
};

function buildPrompt(tone: string): string {
  const instruction = TONE_INSTRUCTIONS[tone] ?? TONE_INSTRUCTIONS["Formální"];
  return `You are a professional business email assistant. Generate a Czech reply to the Hungarian email below.

TONE: ${tone} — ${instruction}

FORMATTING RULES (strictly follow):
1. Start with a proper greeting on its own line (e.g. "Vážený pane," or "Dobrý den,")
2. Leave a blank line after the greeting
3. Write the body in clear paragraphs, each separated by a blank line
4. End with a closing phrase on its own line (e.g. "S pozdravem,")
5. Leave the signature line blank (just write "S pozdravem," or similar and stop — do not invent a name)
6. Use **double asterisks** around important phrases, deadlines, key requests, or action items (e.g. **do 48 hodin**, **vrácení platby**)

LANGUAGE: Reply must be written entirely in CZECH. Never use Hungarian or English in the reply.
OUTPUT: Return only the email text. No explanations, no notes, no JSON.`;
}

export async function POST(req: NextRequest) {
  if (req.cookies.get(SESSION_COOKIE)?.value !== "granted") {
    return NextResponse.json({ error: "Přístup odepřen." }, { status: 401 });
  }

  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (!groqKey) return NextResponse.json({ error: "GROQ_API_KEY není nastaven." }, { status: 500 });

  const { email, tone } = await req.json();
  if (!email?.trim()) return NextResponse.json({ error: "Text e-mailu je prázdný." }, { status: 400 });

  const resolvedTone = TONE_INSTRUCTIONS[tone] ? tone : "Formální";
  console.log(`[regenerate-reply] Generating Czech reply | tone: ${resolvedTone}`);

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + groqKey,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: buildPrompt(resolvedTone) },
          { role: "user", content: email },
        ],
        max_tokens: 1500,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("[regenerate-reply] Groq error:", data);
      return NextResponse.json({ error: data?.error?.message || `Groq HTTP ${res.status}` }, { status: res.status });
    }

    const czechReply = data?.choices?.[0]?.message?.content?.trim();
    if (!czechReply) return NextResponse.json({ error: "Prázdná odpověď od AI." }, { status: 500 });

    console.log(`[regenerate-reply] Done (${czechReply.length} chars)`);
    return NextResponse.json({ czechReply });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Neočekávaná chyba.";
    console.error("[regenerate-reply] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
