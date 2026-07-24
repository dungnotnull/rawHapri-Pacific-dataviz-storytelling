"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import {
  cleanWaterData,
  cleanWaterCountries,
  cleanWaterYears,
  shortName,
} from "@/lib/data";
import { makePalette } from "@/lib/colors";
import YearScrubber from "@/components/ui/YearScrubber";
import Flag from "@/components/ui/Flag";

const MARGIN = { top: 20, right: 40, bottom: 30, left: 24 };
const ROW_H = 30;

export default function Part2Chart1() {
  const palette = useMemo(() => makePalette(cleanWaterCountries), []);
  const [year, setYear] = useState(cleanWaterYears[cleanWaterYears.length - 1]);
  const [hover, setHover] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);

  useEffect(() => {
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(e.contentRect.width);
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // rank table: rankByYear[year] = ordered list of country names (rank 0 = best)
  const rankByYear = useMemo(() => {
    const table: Record<number, string[]> = {};
    for (const yr of cleanWaterYears) {
      const withVal = cleanWaterCountries
        .map((name) => {
          const pt = cleanWaterData[name].total.find((s) => s.year === yr);
          return { name, value: pt ? pt.value : -Infinity };
        })
        .sort((a, b) => b.value - a.value);
      table[yr] = withVal.map((d) => d.name);
    }
    return table;
  }, []);

  const n = cleanWaterCountries.length;
  const height = n * ROW_H + MARGIN.top + MARGIN.bottom;
  const innerW = Math.max(width - MARGIN.left - MARGIN.right, 200);
  const innerH = n * ROW_H;

  const xYear = useMemo(
    () =>
      d3
        .scalePoint<number>()
        .domain(cleanWaterYears)
        .range([0, innerW])
        .padding(0.5),
    [innerW]
  );

  const yearIdx = cleanWaterYears.indexOf(year);

  const rankOf = (name: string, yr: number) => rankByYear[yr].indexOf(name);

  const valueOf = (name: string, yr: number) =>
    cleanWaterData[name].total.find((s) => s.year === yr)?.value;

  return (
    <section id="part2-chart1" className="relative bg-foam px-6 py-14 md:px-16">
      <div className="mx-auto max-w-6xl">
        <h1 className="font-display text-3xl sm:text-4xl text-ink max-w-3xl">
          Drinking water ranking, by year &amp; country
        </h1>
        <p className="mt-3 max-w-2xl text-sm sm:text-base text-ink-dim leading-relaxed">
          Ranking of population with safely managed drinking water (SDG 6.1.1),
          2016–2024. Rank 1 (top) is the country with highest access rate. Connecting
          lines show position changes across years.
        </p>

        <div className="mt-8 grid lg:grid-cols-[1fr_70px_260px] gap-4 items-start">
          {/* Chart */}
          <div ref={containerRef} className="chart-paper rounded-lg p-3 sm:p-5">
            <svg width="100%" height={height} viewBox="40 0 860 500" preserveAspectRatio="xMidYMid meet">
              <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
                {/* year axis labels */}
                {cleanWaterYears.map((yr) => (
                  <text
                    key={yr}
                    x={xYear(yr)}
                    y={-6}
                    textAnchor="middle"
                    fill={yr === year ? "var(--gold)" : "var(--ink-faint)"}
                    fontSize={10}
                    fontFamily="var(--font-mono)"
                    fontWeight={yr === year ? 600 : 400}
                  >
                    {yr}
                  </text>
                ))}
                {/* current year vertical guide */}
                <line
                  x1={xYear(year)}
                  x2={xYear(year)}
                  y1={0}
                  y2={innerH}
                  stroke="var(--gold)"
                  strokeDasharray="3,4"
                  opacity={0.5}
                />

                {/* rank lines, only through elapsed years */}
                {cleanWaterCountries.map((name) => {
                  const isHover = hover === name;
                  const pastYears = cleanWaterYears.slice(0, yearIdx + 1);
                  const pathD = d3
                    .line<number>()
                    .x((yr) => xYear(yr) ?? 0)
                    .y((yr) => rankOf(name, yr) * ROW_H + ROW_H / 2)
                    .curve(d3.curveMonotoneX)(pastYears);
                  return (
                    <path
                      key={name}
                      d={pathD ?? ""}
                      fill="none"
                      stroke={palette.get(name)}
                      strokeWidth={isHover ? 3.5 : 2}
                      opacity={isHover ? 1 : hover ? 0.15 : 0.75}
                      style={{ transition: "opacity 180ms" }}
                      onMouseEnter={() => setHover(name)}
                      onMouseLeave={() => setHover(null)}
                    />
                  );
                })}

                {/* nodes at current year */}
                {cleanWaterCountries.map((name) => {
                  const rank = rankOf(name, year);
                  const val = valueOf(name, year);
                  const isHover = hover === name;
                  return (
                    <g
                      key={name}
                      transform={`translate(${xYear(year)},${rank * ROW_H + ROW_H / 2})`}
                      style={{ transition: "transform 550ms cubic-bezier(.4,0,.2,1)" }}
                      onMouseEnter={() => setHover(name)}
                      onMouseLeave={() => setHover(null)}
                    >
                      <circle
                        r={isHover ? 7 : 5}
                        fill={palette.get(name)}
                        stroke="var(--paper-raised)"
                        strokeWidth={1.5}
                        style={{ cursor: "pointer" }}
                      />
                      <text
                        x={14}
                        y={4}
                        fontSize={11}
                        fontFamily="var(--font-mono)"
                        fill="var(--ink)"
                      >
                        {shortName(name)}
                        {val !== undefined && (
                          <tspan fill="var(--gold)" dx={6}>
                            {val.toFixed(0)}%
                          </tspan>
                        )}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>

          {/* Vertical YearScrubber (desktop only) */}
          <div className="hidden lg:block">
            <YearScrubber
              years={cleanWaterYears}
              year={year}
              onChange={setYear}
              speedMs={2000}
              variant="vertical"
            />
          </div>

          {/* Country picker */}
          <div className="chart-paper rounded-lg p-4 h-fit sticky top-24">
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-faint block mb-3">
              Countries
            </span>
            <div className="max-h-[220px] lg:max-h-[500px] overflow-y-auto pr-1 flex flex-col gap-0.5">
              {cleanWaterCountries.map((name) => (
                <button
                  key={name}
                  onMouseEnter={() => setHover(name)}
                  onMouseLeave={() => setHover(null)}
                  className="flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-paper-raised-2 transition-colors"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: palette.get(name) }}
                  />
                  <Flag iso2={cleanWaterData[name].iso2} className="w-4 h-3 shrink-0" />
                  <span className="font-mono text-[11px] text-ink truncate">
                    {shortName(name)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Horizontal YearScrubber (mobile only) */}
          <div className="lg:hidden col-span-full">
            <YearScrubber years={cleanWaterYears} year={year} onChange={setYear} speedMs={2000} />
          </div>
        </div>
      </div>
    </section>
  );
}
