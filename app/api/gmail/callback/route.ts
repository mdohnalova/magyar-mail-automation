import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_FULL } from "@/lib/session";
import { exchangeCodeForTokens } from "@/lib/gmail";
import { saveGmailRefreshToken } from "@/lib/token-store";

export async function GET(req: NextRequest) {
  if (req.cookies.get(SESSION_COOKIE)?.value !== SESSION_FULL) {
    return NextResponse.json({ error: "Přístup odepřen." }, { status: 401 });
  }

  const code = req.nextUrl.searchParams.get("code");
  const oauthError = req.nextUrl.searchParams.get("error");
  if (oauthError) return NextResponse.redirect(new URL(`/?gmail_error=${encodeURIComponent(oauthError)}`, req.url));
  if (!code) return NextResponse.redirect(new URL("/?gmail_error=missing_code", req.url));

  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${req.nextUrl.origin}/api/gmail/callback`;

  try {
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    if (!tokens.refresh_token) {
      return NextResponse.redirect(new URL("/?gmail_error=no_refresh_token", req.url));
    }
    await saveGmailRefreshToken(tokens.refresh_token);
    return NextResponse.redirect(new URL("/?gmail_connected=1", req.url));
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.redirect(new URL(`/?gmail_error=${encodeURIComponent(message)}`, req.url));
  }
}
