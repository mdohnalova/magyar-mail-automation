import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST(req: NextRequest) {
  const accessCode = process.env.ACCESS_CODE?.trim();
  if (!accessCode) {
    return NextResponse.json({ error: "Přístupový kód není na serveru nastaven." }, { status: 500 });
  }

  const { code } = await req.json();
  if (typeof code !== "string" || code.trim() !== accessCode) {
    return NextResponse.json({ error: "Nesprávný přístupový kód." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "granted", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
