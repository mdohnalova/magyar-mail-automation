import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_DEMO, SESSION_FULL } from "@/lib/session";

const INVALID = NextResponse.json({ error: "Nesprávné jméno nebo heslo pro zvolenou verzi." }, { status: 401 });

export async function POST(req: NextRequest) {
  const { mode, username, password } = await req.json();
  const trimmedUsername = typeof username === "string" ? username.trim() : "";
  const trimmedPassword = typeof password === "string" ? password.trim() : "";

  let session: string | null = null;

  if (mode === "demo") {
    const expectedUsername = process.env.ACCESS_USERNAME?.trim();
    const expectedPassword = process.env.ACCESS_CODE?.trim();
    if (expectedUsername && expectedPassword && trimmedUsername === expectedUsername && trimmedPassword === expectedPassword) {
      session = SESSION_DEMO;
    }
  } else if (mode === "full") {
    const expectedUsername = process.env.FULL_ACCESS_USERNAME?.trim();
    const expectedPassword = process.env.FULL_ACCESS_CODE?.trim();
    if (expectedUsername && expectedPassword && trimmedUsername === expectedUsername && trimmedPassword === expectedPassword) {
      session = SESSION_FULL;
    }
  }

  if (!session) return INVALID;

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, session, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
