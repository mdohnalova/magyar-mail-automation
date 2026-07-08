import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_FULL } from "@/lib/session";
import { createDraftReply, refreshAccessToken } from "@/lib/gmail";
import { getGmailRefreshToken } from "@/lib/token-store";

export async function POST(req: NextRequest) {
  if (req.cookies.get(SESSION_COOKIE)?.value !== SESSION_FULL) {
    return NextResponse.json({ error: "Přístup odepřen." }, { status: 401 });
  }

  const { threadId, to, subject, body, inReplyTo } = await req.json();
  if (!threadId || !to || !body?.trim()) {
    return NextResponse.json({ error: "Chybí povinné údaje pro vytvoření konceptu." }, { status: 400 });
  }

  try {
    const refreshToken = await getGmailRefreshToken();
    if (!refreshToken) return NextResponse.json({ error: "Gmail není propojen." }, { status: 400 });

    const accessToken = await refreshAccessToken(refreshToken);
    await createDraftReply(accessToken, {
      threadId,
      to,
      subject: subject ?? "",
      body,
      inReplyTo: inReplyTo ?? "",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Neočekávaná chyba.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
