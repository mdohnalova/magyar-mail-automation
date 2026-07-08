import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_FULL } from "@/lib/session";
import { getMessage, listUnreadMessages, refreshAccessToken } from "@/lib/gmail";
import { getGmailRefreshToken } from "@/lib/token-store";

export async function GET(req: NextRequest) {
  if (req.cookies.get(SESSION_COOKIE)?.value !== SESSION_FULL) {
    return NextResponse.json({ error: "Přístup odepřen." }, { status: 401 });
  }

  try {
    const refreshToken = await getGmailRefreshToken();
    if (!refreshToken) return NextResponse.json({ error: "Gmail není propojen." }, { status: 400 });

    const accessToken = await refreshAccessToken(refreshToken);
    const messages = await listUnreadMessages(accessToken, 10);
    const details = await Promise.all(messages.map((m) => getMessage(accessToken, m.id)));

    return NextResponse.json({ messages: details });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Neočekávaná chyba.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
