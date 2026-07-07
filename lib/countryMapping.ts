// Country name to ISO code mapping (3-letter codes to match ghg_per_capita.json)
export function getCountryCode(countryName: string): string {
  const nameToCode: Record<string, string> = {
    // Pacific Island Countries (3-letter ISO codes)
    "Kiribati": "KIR",
    "Marshall Islands": "MHL",
    "Federated States of Micronesia": "FSM",
    "Nauru": "NRU",
    "Palau": "PLW",
    "Papua New Guinea": "PNG",
    "Solomon Islands": "SLB",
    "Tonga": "TON",
    "Tuvalu": "TUV",
    "Vanuatu": "VUT",
    "Samoa": "WSM",
    "Fiji": "FJI",
    "New Caledonia": "NCL",
    // Major emitters (2-letter codes - these don't have GHG year data)
    "Qatar": "QA",
    "Kuwait": "KW",
    "United Arab Emirates": "AE",
    "Bahrain": "BH",
    "Saudi Arabia": "SA",
    "Australia": "AU",
    "United States": "US",
    "Canada": "CA",
    "Russia": "RU",
    "Germany": "DE",
    "Japan": "JP",
    "South Korea": "KR",
    "China": "CN",
  };
  return nameToCode[countryName] || "";
}

// Check if a country is a Pacific Island Country
export function isPacificCountry(countryName: string): boolean {
  const pacificCountries = [
    "Kiribati", "Marshall Islands", "Federated States of Micronesia", "Nauru",
    "Palau", "Papua New Guinea", "Solomon Islands", "Tonga", "Tuvalu",
    "Vanuatu", "Samoa", "Fiji", "New Caledonia"
  ];
  return pacificCountries.includes(countryName);
}
