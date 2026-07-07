import { cookies } from "next/headers";
import { AccessGate } from "@/components/access-gate";
import { MagyarMailApp } from "@/components/magyar-mail-app";
import { DEMO_LIMIT, SESSION_COOKIE, USAGE_COOKIE, parseUsageCount } from "@/lib/session";

export default async function Page() {
  const store = await cookies();
  const hasSession = store.get(SESSION_COOKIE)?.value === "granted";

  if (!hasSession) {
    return <AccessGate />;
  }

  const used = parseUsageCount(store.get(USAGE_COOKIE)?.value);
  const remaining = Math.max(0, DEMO_LIMIT - used);

  return <MagyarMailApp initialRemaining={remaining} />;
}
