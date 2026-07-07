import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_DEMO, SESSION_FULL } from "@/lib/session";

export async function POST(req: NextRequest) {
  const accessCode = process.env.ACCESS_CODE?.trim();
  const fullAccessCode = process.env.FULL_ACCESS_CODE?.trim();

  const { code } = await req.json();
  const trimmedCode = typeof code === "string" ? code.trim() : "";

  let session: string | null = null;
  if (accessCode && trimmedCode === accessCode) session = SESSION_DEMO;
  else if (fullAccessCode && trimmedCode === fullAccessCode) session = SESSION_FULL;

  if (!session) {
    return NextResponse.json({ error: "Nesprávný přístupový kód." }, { status: 401 });
  }

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
