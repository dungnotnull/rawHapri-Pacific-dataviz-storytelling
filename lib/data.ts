import seaLevelRaw from "@/data/sea_level.json";
import cleanWaterRaw from "@/data/clean_water.json";
import cleanWaterFullRaw from "@/data/clean_water_full.json";
import correlationRaw from "@/data/correlation_matrix.json";

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

// ---- Full multi-indicator clean-water dataset ----

export interface IndicatorCountry {
  iso2: string;
  total: YearValue[];
  urban: YearValue[];
  rural: YearValue[];
}

export interface IndicatorDef {
  id: string;
  label: string;
  desc: string;
  polarity: "good" | "bad";
  years: number[];
  countries: Record<string, IndicatorCountry>;
}

export const cleanWaterFull = cleanWaterFullRaw as Record<string, IndicatorDef>;
export const indicatorIds = Object.keys(cleanWaterFull);
export const ALL_INDICATOR_YEARS = cleanWaterFull[indicatorIds[0]].years;

// ---- Rolling correlation matrix (sea level x clean-water indicators) ----

export interface CorrelationMatrixData {
  years: number[];
  variables: string[];
  varLabels: Record<string, string>;
  windowSize: number;
  minPoints: number;
  regionalMeans: Record<string, Record<string, number | null>>;
  matrices: Record<
    string,
    { r: (number | null)[][]; windowYears: number[]; n: number }
  >;
}

export const correlationMatrix = correlationRaw as CorrelationMatrixData;

// Label translations for Vietnamese indicators
export const INDICATOR_LABEL_MAP: Record<string, string> = {
  "Nước uống được quản lý an toàn": "Safely managed drinking water",
  "Có nơi rửa tay cơ bản tại nhà": "Basic handwashing facilities at home",
  "Vệ sinh được quản lý an toàn": "Safely managed sanitation",
  "Đi vệ sinh lộ thiên (phóng uế bừa bãi)": "Open defecation (to be eliminated)",
  // Correlation matrix labels
  "Mực nước biển": "Sea level",
  "Nước uống an toàn": "Safe drinking water",
  "Rửa tay cơ bản": "Basic handwashing",
  "Vệ sinh lộ thiên": "Open defecation",
  "Vệ sinh an toàn": "Safe sanitation"
};

/** Get translated label for an indicator */
export const getIndicatorLabel = (vietnameseLabel: string): string => {
  return INDICATOR_LABEL_MAP[vietnameseLabel] || vietnameseLabel;
};

/** Countries that have a "total" series for every clean-water indicator —
 * the only ones comparable across all axes of the radar chart. */
export const radarCountries = Object.keys(
  cleanWaterFull[indicatorIds[0]].countries
).filter((name) =>
  indicatorIds.every((id) => {
    const c = cleanWaterFull[id].countries[name];
    return c && c.total.length > 0;
  })
).sort((a, b) => a.localeCompare(b));

export const radarCountryIso2 = (name: string): string =>
  cleanWaterFull[indicatorIds[0]].countries[name]?.iso2 ??
  Object.values(cleanWaterFull)
    .map((ind) => ind.countries[name]?.iso2)
    .find(Boolean) ??
  "un";

// ---- Sparse supplementary indicator (EN_WWT_WWDS) ----
import wwdsRaw from "@/data/wwds_snapshot.json";
export interface WwdsRow {
  name: string;
  iso2: string;
  year: number;
  value: number;
}
export const wwdsSnapshot = wwdsRaw as WwdsRow[];
export const wwdsYears = Array.from(new Set(wwdsSnapshot.map((r) => r.year))).sort(
  (a, b) => a - b
);


