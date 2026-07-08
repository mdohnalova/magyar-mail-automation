// Lightweight, client-side PII pseudonymization: replace names/emails/phone
// numbers with placeholder tokens before any text leaves the browser for
// Groq/DeepL, and swap them back afterwards. The token↔value map never
// leaves the browser.

const EMAIL_REGEX = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const PHONE_REGEX = /(?:\+\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s-]?\d{3}[\s-]?\d{3,4}(?:[\s-]?\d{2,3})?/g;

const CLOSING_PHRASES = [
  "S pozdravem", "Se srdečným pozdravem", "S úctou",
  "Üdvözlettel", "Tisztelettel",
  "Best regards", "Kind regards", "Regards", "Sincerely", "Yours sincerely", "Yours faithfully",
  "Mit freundlichen Grüßen", "Viele Grüße",
  "Cordialement", "Atentamente", "Distinti saluti",
];

function isLikelyName(s: string): boolean {
  if (!s || s.length > 40) return false;
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length < 1 || words.length > 4) return false;
  return words.every((w) => /^\p{Lu}[\p{L}'-]*$/u.test(w));
}

function findHeaderName(text: string): string | null {
  const match = text.match(/^(?:Od|From|Feladó|Absender)\s*:\s*(.+?)\s*[(<]/im);
  if (match) {
    const candidate = match[1].trim();
    if (isLikelyName(candidate)) return candidate;
  }
  return null;
}

function findSignatureName(lines: string[]): string | null {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim().replace(/[,.:]+$/, "");
    if (CLOSING_PHRASES.some((p) => line.toLowerCase() === p.toLowerCase())) {
      for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
        const candidate = lines[j].trim();
        if (candidate && isLikelyName(candidate)) return candidate;
      }
    }
  }
  return null;
}

export function maskPII(text: string): { maskedText: string; map: Record<string, string> } {
  const map: Record<string, string> = {};
  const reverse = new Map<string, string>();
  const counters = { EMAIL: 0, TELEFON: 0, JMENO: 0 };

  function tokenFor(type: keyof typeof counters, value: string): string {
    const existing = reverse.get(value);
    if (existing) return existing;
    counters[type] += 1;
    const token = `[${type}_${counters[type]}]`;
    map[token] = value;
    reverse.set(value, token);
    return token;
  }

  let masked = text;

  const headerName = findHeaderName(masked);
  if (headerName) masked = masked.split(headerName).join(tokenFor("JMENO", headerName));

  const sigName = findSignatureName(masked.split("\n"));
  if (sigName) masked = masked.split(sigName).join(tokenFor("JMENO", sigName));

  masked = masked.replace(EMAIL_REGEX, (m) => tokenFor("EMAIL", m));
  masked = masked.replace(PHONE_REGEX, (m) => (m.replace(/\D/g, "").length >= 7 ? tokenFor("TELEFON", m) : m));

  return { maskedText: masked, map };
}

export function unmaskPII(text: string, map: Record<string, string>): string {
  let result = text;
  for (const [token, original] of Object.entries(map)) {
    result = result.split(token).join(original);
  }
  return result;
}

export function remaskPII(text: string, map: Record<string, string>): string {
  let result = text;
  const entries = Object.entries(map).sort((a, b) => b[1].length - a[1].length);
  for (const [token, original] of entries) {
    if (original) result = result.split(original).join(token);
  }
  return result;
}
