// Minimal Gmail API client: OAuth (authorization code + refresh) and the
// handful of endpoints needed to list unread mail and create draft replies.
// Deliberately never calls the send endpoint — replies always land as a
// Gmail draft for a human to review and send.

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.compose",
].join(" ");

export interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  messageIdHeader: string;
  snippet: string;
  body: string;
}

export function buildAuthUrl(redirectUri: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID není nastaven.");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<{ access_token: string; refresh_token?: string }> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuth klíče nejsou nastaveny.");

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error_description || data?.error || `Výměna kódu za token selhala (HTTP ${res.status})`);
  return data;
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuth klíče nejsou nastaveny.");

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error_description || data?.error || `Obnovení tokenu selhalo (HTTP ${res.status})`);
  return data.access_token as string;
}

function decodeBase64Url(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}

function encodeBase64Url(input: string): string {
  return Buffer.from(input, "utf-8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractPlainTextBody(payload: any): string {
  if (payload?.mimeType === "text/plain" && payload?.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  for (const part of payload?.parts ?? []) {
    const text = extractPlainTextBody(part);
    if (text) return text;
  }
  if (!payload?.parts && payload?.body?.data) return decodeBase64Url(payload.body.data);
  return "";
}

export async function listUnreadMessages(accessToken: string, maxResults = 10): Promise<{ id: string; threadId: string }[]> {
  const res = await fetch(`${GMAIL_API_BASE}/messages?q=is:unread&maxResults=${maxResults}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Načtení schránky selhalo (HTTP ${res.status})`);
  return data.messages ?? [];
}

export async function getMessage(accessToken: string, messageId: string): Promise<GmailMessage> {
  const res = await fetch(`${GMAIL_API_BASE}/messages/${messageId}?format=full`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Načtení zprávy selhalo (HTTP ${res.status})`);

  const headers: { name: string; value: string }[] = data.payload?.headers ?? [];
  const getHeader = (name: string) => headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";

  return {
    id: data.id,
    threadId: data.threadId,
    subject: getHeader("Subject"),
    from: getHeader("From"),
    messageIdHeader: getHeader("Message-ID"),
    snippet: data.snippet ?? "",
    body: extractPlainTextBody(data.payload) || data.snippet || "",
  };
}

export async function createDraftReply(accessToken: string, params: {
  threadId: string;
  to: string;
  subject: string;
  body: string;
  inReplyTo: string;
}): Promise<void> {
  const subject = params.subject.toLowerCase().startsWith("re:") ? params.subject : `Re: ${params.subject}`;
  const rawMessage = [
    `To: ${params.to}`,
    `Subject: ${subject}`,
    params.inReplyTo ? `In-Reply-To: ${params.inReplyTo}` : "",
    params.inReplyTo ? `References: ${params.inReplyTo}` : "",
    `Content-Type: text/plain; charset="UTF-8"`,
    "",
    params.body,
  ].filter(Boolean).join("\r\n");

  const res = await fetch(`${GMAIL_API_BASE}/drafts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ message: { raw: encodeBase64Url(rawMessage), threadId: params.threadId } }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error?.message || `Vytvoření konceptu selhalo (HTTP ${res.status})`);
  }
}
