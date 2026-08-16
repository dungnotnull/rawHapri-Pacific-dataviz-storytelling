"use client";

import { useMemo, useState } from "react";
import * as d3 from "d3";
import { cleanWaterFull, indicatorIds, shortName, getIndicatorLabel } from "@/lib/data";
import Flag from "../../ui/Flag";
import IndicatorSelect from "../../ui/IndicatorSelect";
import YearRangeSelect from "../../ui/YearRangeSelect";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { SourceNote } from "@/components/ui/SourceNote";


type Mode = "delta" | "pct";

export default function ChangePage() {
  const [indicatorId, setIndicatorId] = useState(indicatorIds[0]);
  const indicator = cleanWaterFull[indicatorId];
  const availableCountries = useMemo(
    () =>
      Object.keys(indicator.countries)
        .filter((n) => indicator.countries[n].total.length > 1)
        .sort((a, b) => a.localeCompare(b)),
    [indicator]
  );
  const [country, setCountry] = useState(availableCountries[0]);
  const activeCountry = availableCountries.includes(country)
    ? country
    : availableCountries[0];

  const years = indicator.years;
  const [start, setStart] = useState(years[0]);
  const [end, setEnd] = useState(years[years.length - 1]);
  const [mode, setMode] = useState<Mode>("delta");

  const series = indicator.countries[activeCountry]?.total ?? [];
  const seriesMap = new Map(series.map((p) => [p.year, p.value]));

  const rangeYears = years.filter((y) => y >= start && y <= end);

  const rows = rangeYears.map((y) => {
    const value = seriesMap.get(y);
    const prevValue = seriesMap.get(y - 1);
    const delta =
      value !== undefined && prevValue !== undefined ? value - prevValue : null;
    const pct =
      delta !== null && prevValue ? (delta / prevValue) * 100 : null;
    return { year: y, value: value ?? null, delta, pct };
  });

  const avgValue = useMemo(() => {
    const vals = rows.map((r) => r.value).filter((v): v is number => v !== null);
    return vals.length ? d3.mean(vals)! : null;
  }, [rows]);

  const width = 960;
  const height = 480;
  const margin = { top: 28, right: 60, bottom: 48, left: 52 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const x = d3
    .scaleBand<number>()
    .domain(rangeYears)
    .range([0, innerW])
    .padding(0.35);

  const yValue = d3.scaleLinear().domain([0, 100]).range([innerH, 0]);

  const changeField = mode === "delta" ? "delta" : "pct";
  const changeVals = rows.map((r) => r[changeField]).filter((v): v is number => v !== null);
  const maxAbs = Math.max(1, d3.max(changeVals.map(Math.abs)) ?? 1);
  const yChange = d3.scaleLinear().domain([-maxAbs, maxAbs]).range([innerH, 0]).nice();

  const line = d3
    .line<{ year: number; value: number | null }>()
    .defined((d) => d.value !== null)
    .x((d) => (x(d.year) ?? 0) + x.bandwidth() / 2)
    .y((d) => yValue(d.value as number))
    .curve(d3.curveMonotoneX);

  const isImprovement = (v: number) =>
    indicator.polarity === "good" ? v > 0 : v < 0;

  return (
    <div id="change-section">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-display text-2xl sm:text-3xl text-ink max-w-3xl">
          Clean water indicator changes, year over year
        </h2>
        <p className="mt-3 max-w-2xl text-sm sm:text-base text-ink-dim leading-relaxed">
          xxxxxxxxxxxxxxxxxxxx
        </p>

        <div className="mt-8 flex flex-col gap-4">
          <IndicatorSelect
            value={indicatorId}
            onChange={(id) => {
              setIndicatorId(id);
              const next = Object.keys(cleanWaterFull[id].countries).filter(
                (n) => cleanWaterFull[id].countries[n].total.length > 1
              );
              if (!next.includes(country)) setCountry(next.sort()[0]);
            }}
          />

          <div className="flex flex-wrap items-center gap-4">
            <select
              value={activeCountry}
              onChange={(e) => setCountry(e.target.value)}
              className="bg-paper-raised-2 border border-grid rounded-md px-4 py-2.5 text-[12px] text-ink font-medium hover:border-tide cursor-pointer transition-all hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-brass-bright/30"
            >
              {availableCountries.map((n) => (
                <option key={n} value={n}>
                  {shortName(n)}
                </option>
              ))}
            </select>

            <YearRangeSelect
              years={years}
              start={start}
              end={end}
              onChangeStart={setStart}
              onChangeEnd={setEnd}
            />

            <div className="flex rounded-md overflow-hidden border border-grid text-[12px]">
              <button
                onClick={() => setMode("delta")}
                className={`px-4 py-2.5 font-medium transition-all cursor-pointer ${
                  mode === "delta"
                    ? "bg-brass-bright text-paper shadow-md hover:shadow-lg"
                    : "text-ink-dim hover:text-ink hover:bg-paper-raised hover:shadow-sm"
                }`}
              >
                Percentage points (delta)
              </button>
              <button
                onClick={() => setMode("pct")}
                className={`px-4 py-2.5 font-medium transition-all cursor-pointer ${
                  mode === "pct"
                    ? "bg-brass-bright text-paper shadow-md hover:shadow-lg"
                    : "text-ink-dim hover:text-ink hover:bg-paper-raised hover:shadow-sm"
                }`}
              >
                % change
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 chart-paper rounded-lg p-4 sm:p-6 overflow-x-auto">
          <div className="flex items-center gap-2 mb-3">
            <Flag iso2={indicator.countries[activeCountry]?.iso2 ?? "un"} className="w-5 h-3.5" />
            <span className=" text-[12px] text-ink font-medium">
              {shortName(activeCountry)} &middot; {getIndicatorLabel(indicator.label)}
            </span>
          </div>
          <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="min-w-[640px]">
            <g transform={`translate(${margin.left},${margin.top})`}>
              {/* zero line for change axis */}
              <line
                x1={0}
                x2={innerW}
                y1={yChange(0)}
                y2={yChange(0)}
                stroke="var(--ink-dim)"
                strokeDasharray="3,4"
                opacity={0.7}
                strokeWidth={1.2}
              />

              {/* delta / pct bars */}
              {rows.map((r) => {
                const v = r[changeField];
                if (v === null) return null;
                const barY = v >= 0 ? yChange(v) : yChange(0);
                const barH = Math.abs(yChange(v) - yChange(0));
                const bx = x(r.year) ?? 0;
                return (
                  <rect
                    key={`bar-${r.year}`}
                    x={bx}
                    y={barY}
                    width={x.bandwidth()}
                    height={Math.max(barH, 1.5)}
                    fill={isImprovement(v) ? "var(--tide)" : "var(--coral)"}
                    opacity={0.8}
                    rx={2.5}
                    style={{ transition: "y 450ms ease, height 450ms ease" }}
                  />
                );
              })}

              {/* average line */}
              {avgValue !== null && (
                <>
                  <line
                    x1={0}
                    x2={innerW}
                    y1={yValue(avgValue)}
                    y2={yValue(avgValue)}
                    stroke="var(--brass-bright)"
                    strokeDasharray="6,4"
                    strokeWidth={2}
                    opacity={0.9}
                  />
                  <text
                    x={innerW}
                    y={yValue(avgValue) - 8}
                    textAnchor="end"
                    fontSize={12}
                    fill="var(--brass-bright)"
                    fontWeight={600}
                  >
                    Avg {avgValue.toFixed(1)}%
                  </text>
                </>
              )}

              {/* value line */}
              <path d={line(rows) ?? ""} fill="none" stroke="var(--ink)" strokeWidth={2.5} />
              {rows.map(
                (r) =>
                  r.value !== null && (
                    <circle
                      key={`pt-${r.year}`}
                      cx={(x(r.year) ?? 0) + x.bandwidth() / 2}
                      cy={yValue(r.value)}
                      r={3.8}
                      fill="var(--ink)"
                      stroke="var(--paper-raised)"
                      strokeWidth={1.5}
                    />
                  )
              )}

              {/* x axis */}
              {rangeYears.map((y) => (
                <text
                  key={y}
                  x={(x(y) ?? 0) + x.bandwidth() / 2}
                  y={innerH + 24}
                  textAnchor="middle"
                  fontSize={14}
                  fill="var(--ink-dim)"
                  fontWeight={500}
                >
                  {y}
                </text>
              ))}

              {/* left axis (value) */}
              {[0, 25, 50, 75, 100].map((t) => (
                <text
                  key={`l-${t}`}
                  x={-12}
                  y={yValue(t) + 4}
                  textAnchor="end"
                  fontSize={13}
                  fill="var(--ink-dim)"
                  fontWeight={500}
                >
                  {t}
                </text>
              ))}

              {/* right axis (change) */}
              {yChange.ticks(5).map((t) => (
                <text
                  key={`r-${t}`}
                  x={innerW + 12}
                  y={yChange(t) + 4}
                  fontSize={13}
                  fill="var(--ink-dim)"
                  fontWeight={500}
                >
                  {t > 0 ? `+${t}` : t}
                  {mode === "pct" ? "%" : ""}
                </text>
              ))}
            </g>
          </svg>
          <div className="flex justify-between text-[10px] text-ink-dant px-2 mt-2">
            <span className="font-medium">▬ Actual value (left axis, %)</span>
            <span className="font-medium">
              █ {mode === "delta" ? "% point change (right axis)" : "% change vs previous year (right axis)"}
            </span>
          </div>
        </div>
          <SourceNote className="text-primary text-xs mt-0">
                        <span>Source: Pacific Data Hub, CLIMATE_CHANGE_SEA_INDICATORS, 2016–2023.</span>
                      </SourceNote>
               <ScrollReveal animation="fade-up" delay={600}>
                  <p className="mt-4 max-w-2xl text-sm text-primary leading-relaxed opacity-[0.7]">
                    Bars show change from the previous year (percentage points or relative
          percent); the line shows actual values over years; the dashed horizontal
          line is the average over the selected year range. Filter by time range
          available in the dataset ({years[0]}–{years[years.length - 1]}).
                  </p>
                </ScrollReveal>
      </div>
    </div>
  );
}
