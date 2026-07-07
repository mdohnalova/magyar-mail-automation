export const SESSION_COOKIE = "mm_session";
export const SESSION_DEMO = "granted";
export const SESSION_FULL = "granted_full";
export const USAGE_COOKIE = "mm_usage";
export const DEMO_LIMIT = 3;

export function isValidSession(value: string | undefined): boolean {
  return value === SESSION_DEMO || value === SESSION_FULL;
}

export function parseUsageCount(raw: string | undefined): number {
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) && n > 0 ? n : 0;
}
