import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_FULL } from "@/lib/session";
import { getGmailRefreshToken } from "@/lib/token-store";

export async function GET(req: NextRequest) {
  if (req.cookies.get(SESSION_COOKIE)?.value !== SESSION_FULL) {
    return NextResponse.json({ error: "Přístup odepřen." }, { status: 401 });
  }

  try {
    const token = await getGmailRefreshToken();
    return NextResponse.json({ connected: Boolean(token) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Neočekávaná chyba.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
