"use client";

import { useMemo, useState } from "react";
import * as d3 from "d3";
import { cleanWaterFull, indicatorIds, shortName, getIndicatorLabel } from "@/lib/data";
import IndicatorSelect from "@/components/ui/IndicatorSelect";
import Flag from "@/components/ui/Flag";
import { makePalette } from "@/lib/colors";


interface YearStats {
  year: number;
  q1: number;
  median: number;
  q3: number;
  whiskerLow: number;
  whiskerHigh: number;
  mean: number;
  n: number;
  points: { name: string; iso2: string; value: number; jitter: number; color: string }[];
  outliers: { name: string; iso2: string; value: number }[];
}

function seededJitter(seed: number) {
  const x = Math.sin(seed * 999.7) * 10000;
  return (x - Math.floor(x)) - 0.5;
}

export default function DistributionPage() {
  const [indicatorId, setIndicatorId] = useState(indicatorIds[0]);
  const indicator = cleanWaterFull[indicatorId];
  const [hover, setHover] = useState<{ year: number; name: string; value: number; iso2: string } | null>(
    null
  );

  // Translate label
  const translatedLabel = getIndicatorLabel(indicator.label);

  // Create color palette for countries
  const countryNames = useMemo(() => Object.keys(indicator.countries).sort(), [indicator]);
  const palette = useMemo(() => makePalette(countryNames), [countryNames]);

  const stats: YearStats[] = useMemo(() => {
    return indicator.years.map((year) => {
      const entries = Object.entries(indicator.countries)
        .map(([name, c]) => {
          const pt = c.total.find((p) => p.year === year);
          return pt ? { name, iso2: c.iso2, value: pt.value } : null;
        })
        .filter((v): v is { name: string; iso2: string; value: number } => v !== null);

      const sorted = [...entries].sort((a, b) => a.value - b.value);
      const values = sorted.map((e) => e.value);
      const q1 = d3.quantileSorted(values, 0.25) ?? values[0];
      const median = d3.quantileSorted(values, 0.5) ?? values[0];
      const q3 = d3.quantileSorted(values, 0.75) ?? values[0];
      const iqr = q3 - q1;
      const lowerFence = q1 - 1.5 * iqr;
      const upperFence = q3 + 1.5 * iqr;
      const inRange = sorted.filter((e) => e.value >= lowerFence && e.value <= upperFence);
      const outliers = sorted.filter((e) => e.value < lowerFence || e.value > upperFence);
      const whiskerLow = inRange.length ? inRange[0].value : values[0];
      const whiskerHigh = inRange.length ? inRange[inRange.length - 1].value : values[values.length - 1];
      const mean = d3.mean(values) ?? 0;

      return {
        year,
        q1,
        median,
        q3,
        whiskerLow,
        whiskerHigh,
        mean,
        n: values.length,
        points: sorted.map((e, i) => ({ ...e, jitter: seededJitter(i + year), color: palette.get(e.name) ?? "var(--brass-bright)" })),
        outliers,
      };
    });
  }, [indicator, palette]);

  const width = 1200;
  const height = 580;
  const margin = { top: 32, right: 40, bottom: 56, left: 60 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const x = d3
    .scaleBand<number>()
    .domain(indicator.years)
    .range([0, innerW])
    .padding(0.3);
  const y = d3.scaleLinear().domain([0, 100]).range([innerH, 0]);

  const meanLine = d3
    .line<YearStats>()
    .x((d) => (x(d.year) ?? 0) + x.bandwidth() / 2)
    .y((d) => y(d.mean))
    .curve(d3.curveMonotoneX);

  return (
    <div id="distribution-section">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-6 sm:py-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-tide mb-3">
          Analysis Station &middot; Distribution
        </p>
        <h2 className="font-display text-2xl sm:text-3xl text-ink max-w-3xl">
          Disparities between countries across years
        </h2>
        <p className="mt-3 max-w-2xl text-sm sm:text-base text-ink-dim leading-relaxed">
          Each box plot summarizes dispersion between countries in a year: the center
          line is the median, the box is the interquartile range (Q1–Q3), whiskers are
          the non-outlier range, and dots are individual countries (hover to identify).
          The yellow dashed line connects mean values across years.
        </p>

        <div className="mt-8">
          <IndicatorSelect value={indicatorId} onChange={setIndicatorId} />
        </div>

        <div className="mt-6 grid lg:grid-cols-[1fr_320px] gap-6 items-start">
          <div className="chart-paper rounded-lg p-4 sm:p-6">
            <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="w-full">
              <g transform={`translate(${margin.left},${margin.top})`}>
                {/* Y axis grid lines and labels */}
                {[0, 20, 40, 60, 80, 100].map((t) => (
                  <g key={t}>
                    <line x1={0} x2={innerW} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth={1} />
                    <text x={-14} y={y(t) + 4} textAnchor="end" fontSize={15} fontFamily="var(--font-mono)" fill="var(--ink)" fontWeight={600}>
                      {t}%
                    </text>
                  </g>
                ))}

                {stats.map((s) => {
                  const bx = x(s.year) ?? 0;
                  const bw = x.bandwidth();
                  const cx = bx + bw / 2;
                  return (
                    <g key={s.year}>
                      {/* whiskers - subtle */}
                      <line x1={cx} x2={cx} y1={y(s.whiskerLow)} y2={y(s.q1)} stroke="var(--ink-dim)" strokeWidth={1.5} opacity={0.4} />
                      <line x1={cx} x2={cx} y1={y(s.q3)} y2={y(s.whiskerHigh)} stroke="var(--ink-dim)" strokeWidth={1.5} opacity={0.4} />
                      <line x1={cx - bw * 0.2} x2={cx + bw * 0.2} y1={y(s.whiskerLow)} y2={y(s.whiskerLow)} stroke="var(--ink-dim)" strokeWidth={1.5} opacity={0.4} />
                      <line x1={cx - bw * 0.2} x2={cx + bw * 0.2} y1={y(s.whiskerHigh)} y2={y(s.whiskerHigh)} stroke="var(--ink-dim)" strokeWidth={1.5} opacity={0.4} />
                      {/* box - very subtle */}
                      <rect
                        x={bx}
                        y={y(s.q3)}
                        width={bw}
                        height={Math.max(y(s.q1) - y(s.q3), 1)}
                        fill="var(--tide)"
                        fillOpacity={0.12}
                        stroke="var(--tide)"
                        strokeWidth={1.2}
                        strokeOpacity={0.35}
                        rx={2}
                      />
                      {/* median - subtle */}
                      <line x1={bx} x2={bx + bw} y1={y(s.median)} y2={y(s.median)} stroke="var(--tide-2)" strokeWidth={2} opacity={0.6} />
                      {/* jittered raw points */}
                      {s.points.map((p) => (
                        <circle
                          key={p.name}
                          cx={cx + p.jitter * bw * 0.6}
                          cy={y(p.value)}
                          r={hover?.year === s.year && hover?.name === p.name ? 8 : 5.5}
                          fill={p.color}
                          stroke="var(--paper-raised)"
                          strokeWidth={1.2}
                          opacity={1}
                          onMouseEnter={() => setHover({ year: s.year, name: p.name, value: p.value, iso2: p.iso2 })}
                          onMouseLeave={() => setHover(null)}
                          style={{ cursor: "pointer", transition: "r 180ms ease, cx 180ms ease, cy 180ms ease" }}
                        />
                      ))}
                    </g>
                  );
                })}

                {/* mean trend line */}
                <path d={meanLine(stats) ?? ""} fill="none" stroke="var(--brass-bright)" strokeWidth={3} strokeDasharray="7,5" />
                {stats.map((s) => (
                  <circle
                    key={`mean-${s.year}`}
                    cx={(x(s.year) ?? 0) + x.bandwidth() / 2}
                    cy={y(s.mean)}
                    r={5}
                    fill="var(--brass-bright)"
                    stroke="var(--paper-raised)"
                    strokeWidth={1.8}
                  />
                ))}

                {/* X axis labels */}
                {indicator.years.map((yr) => (
                  <text
                    key={yr}
                    x={(x(yr) ?? 0) + x.bandwidth() / 2}
                    y={innerH + 28}
                    textAnchor="middle"
                    fontSize={16}
                    fontFamily="var(--font-mono)"
                    fill="var(--ink)"
                    fontWeight={600}
                  >
                    {yr}
                  </text>
                ))}
              </g>
            </svg>
          </div>

          <div className="flex flex-col gap-5">
            {/* Country Legend */}
            <div className="chart-paper rounded-lg p-5">
              <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-faint block mb-3">
                Countries
              </span>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {countryNames.map((name) => (
                  <div key={name} className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ background: palette.get(name) ?? "var(--ink-faint)" }}
                    />
                    <Flag iso2={indicator.countries[name]?.iso2 ?? "un"} className="w-5 h-3.5 shrink-0" />
                    <span className="font-mono text-[11px] text-ink truncate font-medium">{shortName(name)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Country / Legend */}
            <div className="chart-paper rounded-lg p-5 h-fit">
              <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-faint block mb-3">
                {hover ? "Selected Country" : "Legend"}
              </span>
              {hover ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2.5">
                    <Flag iso2={hover.iso2} className="w-6 h-4" />
                    <span className="font-mono text-[14px] text-ink font-semibold">{shortName(hover.name)}</span>
                  </div>
                  <span className="font-mono text-[12px] text-ink-faint">Year {hover.year}</span>
                  <span className="font-mono text-[28px] text-brass-bright mt-1 font-bold">{hover.value.toFixed(1)}%</span>
                </div>
              ) : (
                <ul className="font-mono text-[11px] text-ink-dim leading-relaxed space-y-2.5">
                  <li><span className="text-tide-2 font-semibold">▬</span> Median line</li>
                  <li><span className="text-tide font-semibold">▭</span> Interquartile range (Q1–Q3)</li>
                  <li className="font-semibold">│ Whiskers (non-outlier range)</li>
                  <li><span className="text-brass-bright font-semibold">●</span> Individual country (hover)</li>
                  <li><span className="text-brass-bright font-semibold">┄</span> Mean trend line</li>
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
