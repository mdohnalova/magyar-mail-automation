import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_FULL } from "@/lib/session";
import { buildAuthUrl } from "@/lib/gmail";

export async function GET(req: NextRequest) {
  if (req.cookies.get(SESSION_COOKIE)?.value !== SESSION_FULL) {
    return NextResponse.json({ error: "Přístup odepřen." }, { status: 401 });
  }

  try {
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${req.nextUrl.origin}/api/gmail/callback`;
    return NextResponse.redirect(buildAuthUrl(redirectUri));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Neočekávaná chyba.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
