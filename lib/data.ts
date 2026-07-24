import seaLevelRaw from "@/data/sea_level_v2.json";
import cleanWaterRaw from "@/data/clean_water.json";

export interface YearValue {
  year: number;
  value: number;
}

export interface SeaLevelCountry {
  iso2: string;
  series: YearValue[];
}

export interface CleanWaterCountry {
  iso2: string;
  total: YearValue[];
  urban: YearValue[];
  rural: YearValue[];
}

export const seaLevelData = seaLevelRaw as Record<string, SeaLevelCountry>;
export const cleanWaterData = cleanWaterRaw as Record<string, CleanWaterCountry>;

export const seaLevelCountries = Object.keys(seaLevelData).sort((a, b) =>
  a.localeCompare(b)
);
export const cleanWaterCountries = Object.keys(cleanWaterData).sort((a, b) =>
  a.localeCompare(b)
);

export const seaLevelYears = Array.from(
  new Set(
    Object.values(seaLevelData).flatMap((c) => c.series.map((s) => s.year))
  )
).sort((a, b) => a - b);

export const cleanWaterYears = Array.from(
  new Set(
    Object.values(cleanWaterData).flatMap((c) => c.total.map((s) => s.year))
  )
).sort((a, b) => a - b);

/** Shorten a few long country names for tight chart labels. */
export const shortName = (name: string): string => {
  const map: Record<string, string> = {
    "Micronesia, Federated State of": "Micronesia (FSM)",
    "Northern Mariana Islands": "N. Mariana Is.",
    "Wallis and Futuna": "Wallis & Futuna",
  };
  return map[name] ?? name;
};
