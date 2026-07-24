"use client";

import { useMemo, useState } from "react";
import * as d3 from "d3";
import { cleanWaterData, cleanWaterCountries, cleanWaterYears, shortName } from "@/lib/data";
import Flag from "@/components/ui/Flag";
import YearScrubber from "@/components/ui/YearScrubber";


const ROW_H = 40;
const ROW_GAP = 10;

export default function Part2Chart2() {
  const [year, setYear] = useState(cleanWaterYears[cleanWaterYears.length - 1]);

  const countries = useMemo(
    () =>
      cleanWaterCountries.filter(
        (name) =>
          cleanWaterData[name].urban.length > 0 ||
          cleanWaterData[name].rural.length > 0
      ),
    []
  );

  // stable order by latest-year total value (fallback urban/rural avg)
  const ordered = useMemo(() => {
    const lastYear = cleanWaterYears[cleanWaterYears.length - 1];
    return [...countries].sort((a, b) => {
      const va =
        cleanWaterData[a].total.find((s) => s.year === lastYear)?.value ?? 0;
      const vb =
        cleanWaterData[b].total.find((s) => s.year === lastYear)?.value ?? 0;
      return vb - va;
    });
  }, [countries]);

  const width = 900;
  const innerLeft = 150;
  const innerRight = 150;
  const innerW = width - innerLeft - innerRight;
  const center = innerW / 2;

  const xScale = useMemo(
    () => d3.scaleLinear().domain([0, 100]).range([0, innerW / 2]),
    [innerW]
  );

  const height = ordered.length * (ROW_H + ROW_GAP) + 30;

  const getVal = (name: string, kind: "urban" | "rural", yr: number) =>
    cleanWaterData[name][kind].find((s) => s.year === yr)?.value;

  return (
    <section id="part2-chart2" className="relative bg-foam px-6 py-14 md:px-16">
    <div className="mx-auto max-w-6xl">
      <h1 className="font-display text-3xl sm:text-4xl text-ink max-w-3xl">
        Drinking water: Rural &mdash; Urban divide
      </h1>
      <p className="mt-3 max-w-2xl text-sm sm:text-base text-ink-dim leading-relaxed">
        Population using safely managed drinking water (SDG 6.1.1), separated
        by rural and urban regions. Only shows countries with disaggregated data.
        Drag the slider to see the gap change over years.
      </p>

      <div className="mt-8 grid lg:grid-cols-[1fr_auto] gap-4 items-start">
        <div>
          <div className="chart-paper rounded-lg p-3 sm:p-5 overflow-x-auto">
          <div className="flex items-center justify-center gap-8 mb-3 font-mono text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "var(--coral)" }} />
            Rural
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "var(--tide)" }} />
            Urban
          </span>
        </div>

        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="min-w-[600px]">
          <g transform="translate(0,10)">
            {/* axis ticks */}
            {[0, 25, 50, 75, 100].map((t) => (
              <g key={`u-${t}`}>
                <text
                  x={innerLeft + center + xScale(t)}
                  y={12}
                  textAnchor="middle"
                  fontSize={9}
                  fontFamily="var(--font-mono)"
                  fill="var(--ink-faint)"
                >
                  {t}
                </text>
                <text
                  x={innerLeft + center - xScale(t)}
                  y={12}
                  textAnchor="middle"
                  fontSize={9}
                  fontFamily="var(--font-mono)"
                  fill="var(--ink-faint)"
                >
                  {t}
                </text>
              </g>
            ))}
            <line
              x1={innerLeft + center}
              x2={innerLeft + center}
              y1={22}
              y2={height - 10}
              stroke="var(--grid)"
            />

            {ordered.map((name, i) => {
              const top = 30 + i * (ROW_H + ROW_GAP);
              const uv = getVal(name, "urban", year);
              const rv = getVal(name, "rural", year);
              const uw = uv !== undefined ? xScale(uv) : 0;
              const rw = rv !== undefined ? xScale(rv) : 0;
              return (
                <g key={name}>
                  <text
                    x={innerLeft + center}
                    y={top - 6}
                    textAnchor="middle"
                    fontSize={11}
                    fontFamily="var(--font-mono)"
                    fill="var(--ink)"
                  >
                    {shortName(name)}
                  </text>
                  {/* rural (left) */}
                  <rect
                    x={innerLeft + center - rw}
                    y={top}
                    width={rw}
                    height={ROW_H - 12}
                    fill="var(--coral)"
                    opacity={rv !== undefined ? 0.85 : 0}
                    rx={2}
                    style={{ transition: "x 550ms cubic-bezier(.4,0,.2,1), width 550ms cubic-bezier(.4,0,.2,1)" }}
                  />
                  {rv !== undefined && (
                    <text
                      x={innerLeft + center - rw - 6}
                      y={top + (ROW_H - 12) / 2 + 4}
                      textAnchor="end"
                      fontSize={10}
                      fontFamily="var(--font-mono)"
                      fill="var(--coral)"
                      style={{ transition: "x 550ms cubic-bezier(.4,0,.2,1)" }}
                    >
                      {rv.toFixed(0)}%
                    </text>
                  )}
                  {/* urban (right) */}
                  <rect
                    x={innerLeft + center}
                    y={top}
                    width={uw}
                    height={ROW_H - 12}
                    fill="var(--tide)"
                    opacity={uv !== undefined ? 0.85 : 0}
                    rx={2}
                    style={{ transition: "width 550ms cubic-bezier(.4,0,.2,1)" }}
                  />
                  {uv !== undefined && (
                    <text
                      x={innerLeft + center + uw + 6}
                      y={top + (ROW_H - 12) / 2 + 4}
                      fontSize={10}
                      fontFamily="var(--font-mono)"
                      fill="var(--tide)"
                      style={{ transition: "x 550ms cubic-bezier(.4,0,.2,1)" }}
                    >
                      {uv.toFixed(0)}%
                    </text>
                  )}
                  {uv === undefined && rv === undefined && (
                    <text
                      x={innerLeft + center}
                      y={top + (ROW_H - 12) / 2 + 4}
                      textAnchor="middle"
                      fontSize={9}
                      fontFamily="var(--font-mono)"
                      fill="var(--ink-faint)"
                    >
                      no data
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
          </div>

          <div className="mt-4 flex flex-wrap gap-3 font-mono text-[10px] text-ink-faint">
        {ordered.map((name) => (
          <span key={name} className="flex items-center gap-1">
            <Flag iso2={cleanWaterData[name].iso2} className="w-3.5 h-2.5" />
            {shortName(name)}
          </span>
        ))}
      </div>
        </div>

      {/* Vertical YearScrubber (desktop only) */}
      <div className="hidden lg:block">
        <YearScrubber
          years={cleanWaterYears}
          year={year}
          onChange={setYear}
          speedMs={1100}
          variant="vertical"
        />
      </div>
    </div>

    {/* Horizontal YearScrubber (mobile only) */}
    <div className="lg:hidden mt-4">
      <YearScrubber years={cleanWaterYears} year={year} onChange={setYear} speedMs={1100} />
    </div>
    </div>
    </section>
  );
}
