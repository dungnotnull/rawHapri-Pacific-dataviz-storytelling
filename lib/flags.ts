// Country code to flag-icons class mapping
export function getFlagClass(countryCode: string): string {
  const codeMap: Record<string, string> = {
    // Pacific Island Countries (3-letter codes from ghg data)
    "FJI": "fj",
    "KIR": "ki",
    "MHL": "mh",
    "FSM": "fm",
    "NRU": "nr",
    "PLW": "pw",
    "PNG": "pg",
    "WSM": "ws",
    "SLB": "sb",
    "TON": "to",
    "TUV": "tv",
    "VUT": "vu",
    "NCL": "nc",
    // Major emitters
    "QA": "qa",
    "KW": "kw",
    "AE": "ae",
    "BH": "bh",
    "SA": "sa",
    "AU": "au",
    "US": "us",
    "CA": "ca",
    "RU": "ru",
    "DE": "de",
    "JP": "jp",
    "KR": "kr",
    "CN": "cn",
  };
  const code = codeMap[countryCode.toUpperCase()];
  return code ? `fi fi-${code}` : "";
}

// Get emoji flag as fallback
export function getFlagEmoji(countryCode: string): string {
  const flagMap: Record<string, string> = {
    FJI: "🇫🇯", KIR: "🇰🇮", MHL: "🇲🇭", FSM: "🇫🇲", NRU: "🇳🇷",
    PLW: "🇵🇼", PNG: "🇵🇬", WSM: "🇼🇸", SLB: "🇸🇧", TON: "🇹🇴",
    TUV: "🇹🇻", VUT: "🇻🇺", NCL: "🇳🇨",
    QA: "🇶🇦", KW: "🇰🇼", AE: "🇦🇪", BH: "🇧🇭", SA: "🇸🇦",
    AU: "🇦🇺", US: "🇺🇸", CA: "🇨🇦", RU: "🇷🇺", DE: "🇩🇪",
    JP: "🇯🇵", KR: "🇰🇷", CN: "🇨🇳",
  };
  return flagMap[countryCode] || "🏳️";
}
