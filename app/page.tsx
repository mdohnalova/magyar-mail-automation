import { cookies } from "next/headers";
import { AccessGate } from "@/components/access-gate";
import { MagyarMailApp } from "@/components/magyar-mail-app";
import { DEMO_LIMIT, SESSION_COOKIE, SESSION_FULL, USAGE_COOKIE, isValidSession, parseUsageCount } from "@/lib/session";

export default async function Page() {
  const store = await cookies();
  const session = store.get(SESSION_COOKIE)?.value;

  if (!isValidSession(session)) {
    return <AccessGate />;
  }

  const unlimited = session === SESSION_FULL;
  const used = parseUsageCount(store.get(USAGE_COOKIE)?.value);
  const remaining = Math.max(0, DEMO_LIMIT - used);

  return <MagyarMailApp initialRemaining={remaining} unlimited={unlimited} />;
}
