import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";
import { toDeeplTargetLang } from "@/lib/languages";

export async function POST(req: NextRequest) {
  if (req.cookies.get(SESSION_COOKIE)?.value !== "granted") {
    return NextResponse.json({ error: "Přístup odepřen." }, { status: 401 });
  }

  const deeplKey = process.env.DEEPL_API_KEY?.trim();
  if (!deeplKey) {
    return NextResponse.json({ error: "DEEPL_API_KEY není nastaven." }, { status: 500 });
  }

  const { czechReply: rawReply, targetLang: rawTargetLang } = await req.json();
  if (!rawReply?.trim()) {
    return NextResponse.json({ error: "Text odpovědi je prázdný." }, { status: 400 });
  }
  if (!rawTargetLang?.trim()) {
    return NextResponse.json({ error: "Cílový jazyk není zadán." }, { status: 400 });
  }
  // Strip **bold** markers before translation so the reply email stays clean
  const czechReply = rawReply.replace(/\*\*(.*?)\*\*/g, "$1");
  const targetLang = toDeeplTargetLang(rawTargetLang);

  const isFreeKey = deeplKey.endsWith(":fx");
  const endpoint = isFreeKey
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";

  console.log(`[translate-reply] DeepL CS→${targetLang} | free key: ${isFreeKey} | endpoint: ${endpoint}`);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "DeepL-Auth-Key " + deeplKey,
      },
      body: JSON.stringify({
        text: [czechReply],
        source_lang: "CS",
        target_lang: targetLang,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("[translate-reply] DeepL error:", data);
      return NextResponse.json({ error: data?.message || `DeepL HTTP ${res.status}` }, { status: res.status });
    }

    const translation = data?.translations?.[0]?.text;
    if (!translation) {
      return NextResponse.json({ error: "Prázdná odpověď od DeepL." }, { status: 500 });
    }

    console.log("[translate-reply] Done");
    return NextResponse.json({ translation });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Neočekávaná chyba.";
    console.error("[translate-reply] Unhandled error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
