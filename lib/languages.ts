export const LANGUAGE_NAMES: Record<string, { label: string; flag: string }> = {
  BG: { label: "Bulharština", flag: "🇧🇬" },
  CS: { label: "Čeština", flag: "🇨🇿" },
  DA: { label: "Dánština", flag: "🇩🇰" },
  DE: { label: "Němčina", flag: "🇩🇪" },
  EL: { label: "Řečtina", flag: "🇬🇷" },
  EN: { label: "Angličtina", flag: "🇬🇧" },
  ES: { label: "Španělština", flag: "🇪🇸" },
  ET: { label: "Estonština", flag: "🇪🇪" },
  FI: { label: "Finština", flag: "🇫🇮" },
  FR: { label: "Francouzština", flag: "🇫🇷" },
  HU: { label: "Maďarština", flag: "🇭🇺" },
  ID: { label: "Indonéština", flag: "🇮🇩" },
  IT: { label: "Italština", flag: "🇮🇹" },
  JA: { label: "Japonština", flag: "🇯🇵" },
  KO: { label: "Korejština", flag: "🇰🇷" },
  LT: { label: "Litevština", flag: "🇱🇹" },
  LV: { label: "Lotyština", flag: "🇱🇻" },
  NB: { label: "Norština", flag: "🇳🇴" },
  NL: { label: "Nizozemština", flag: "🇳🇱" },
  PL: { label: "Polština", flag: "🇵🇱" },
  PT: { label: "Portugalština", flag: "🇵🇹" },
  RO: { label: "Rumunština", flag: "🇷🇴" },
  RU: { label: "Ruština", flag: "🇷🇺" },
  SK: { label: "Slovenština", flag: "🇸🇰" },
  SL: { label: "Slovinština", flag: "🇸🇮" },
  SV: { label: "Švédština", flag: "🇸🇪" },
  TR: { label: "Turečtina", flag: "🇹🇷" },
  UK: { label: "Ukrajinština", flag: "🇺🇦" },
  ZH: { label: "Čínština", flag: "🇨🇳" },
};

export function languageDisplay(code: string): { label: string; flag: string } {
  return LANGUAGE_NAMES[code?.toUpperCase()] ?? { label: code || "?", flag: "🌐" };
}

// DeepL requires a region variant for some languages when used as a *target*
// (source language accepts the plain code).
export function toDeeplTargetLang(code: string): string {
  const upper = code?.toUpperCase();
  if (upper === "EN") return "EN-GB";
  if (upper === "PT") return "PT-PT";
  return upper;
}
