// Thin wrapper over the Vercel KV (Upstash Redis) REST API — used only to
// persist the Gmail OAuth refresh token for this single-user integration.
// No SDK dependency: plain REST calls against the auto-injected env vars.

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const REFRESH_TOKEN_KEY = "gmail_refresh_token";

async function kvFetch(path: string): Promise<{ result: string | null }> {
  if (!KV_URL || !KV_TOKEN) {
    throw new Error("KV úložiště není nastavené (chybí KV_REST_API_URL / KV_REST_API_TOKEN).");
  }
  const res = await fetch(`${KV_URL}${path}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  if (!res.ok) throw new Error(`KV request selhal (HTTP ${res.status})`);
  return res.json();
}

export async function saveGmailRefreshToken(token: string): Promise<void> {
  await kvFetch(`/set/${REFRESH_TOKEN_KEY}/${encodeURIComponent(token)}`);
}

export async function getGmailRefreshToken(): Promise<string | null> {
  const data = await kvFetch(`/get/${REFRESH_TOKEN_KEY}`);
  return data?.result ?? null;
}

export async function clearGmailRefreshToken(): Promise<void> {
  await kvFetch(`/del/${REFRESH_TOKEN_KEY}`);
}
