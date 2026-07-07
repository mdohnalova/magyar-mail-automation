export const SESSION_COOKIE = "mm_session";
export const USAGE_COOKIE = "mm_usage";
export const DEMO_LIMIT = 3;

export function parseUsageCount(raw: string | undefined): number {
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) && n > 0 ? n : 0;
}
