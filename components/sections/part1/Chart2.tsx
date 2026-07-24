"use client";

import { useMemo, useState } from "react";
import * as d3 from "d3";
import {
  seaLevelData,
  seaLevelCountries,
  seaLevelYears,
  shortName,
} from "@/lib/data";
import { makePalette } from "@/lib/colors";
import Flag from "@/components/ui/Flag";
import YearScrubber from "@/components/ui/YearScrubber";


const ROW_H = 34;
const ROW_GAP = 6;

export default function Part1Chart2() {
  const palette = useMemo(() => makePalette(seaLevelCountries), []);
  const [year, setYear] = useState(seaLevelYears[0]);

  const allValuesMm = useMemo(
    () =>
      Object.values(seaLevelData).flatMap((c) =>
        c.series.map((s) => s.value * 1000)
      ),
    []
  );
  const [minV, maxV] = d3.extent(allValuesMm) as [number, number];
  const domainMin = Math.min(minV, 0);
  const domainMax = Math.max(maxV, 1);

  const width = 900;
  const innerLeft = 190; // space for flag + name
  const innerRight = 60; // space for value label
  const innerW = width - innerLeft - innerRight;

  const xScale = useMemo(
    () => d3.scaleLinear().domain([domainMin, domainMax]).range([0, innerW]).nice(),
    [domainMin, domainMax, innerW]
  );

  const x0 = xScale(0);

  // Calculate each country's rank for current year, but keep consistent array order
  const countryRanks = useMemo(() => {
    const ranked = seaLevelCountries
      .map((name) => {
        const c = seaLevelData[name];
        const pt = c.series.find((s) => s.year === year);
        return {
          name,
          iso2: c.iso2,
          value: pt ? pt.value * 1000 : 0,
        };
      })
      .sort((a, b) => b.value - a.value);
    const rankMap: Record<string, number> = {};
    ranked.forEach((c, i) => {
      rankMap[c.name] = i;
    });
    return rankMap;
  }, [year]);

  const height = seaLevelCountries.length * (ROW_H + ROW_GAP);

  return (
        <section id="part1-chart2" className="relative bg-foam px-6 py-14 md:px-16">
    <div className="mx-auto max-w-6xl">
      <h1 className="font-display text-3xl sm:text-4xl text-ink max-w-3xl">
        Sea level race over years
      </h1>
      <p className="mt-3 max-w-2xl text-sm sm:text-base text-ink-dim leading-relaxed">
        Ranking of island nations by sea level anomaly (mm) each year. Press
        Play to see how rankings change from 1993 to 2023.
      </p>

      <div className="mt-8 grid lg:grid-cols-[1fr_auto] gap-4 items-start">
        {/* Chart */}
        <div className="chart-paper rounded-lg pr-3 sm:pr-5 overflow-x-auto">
          <svg width="100%" height={40} viewBox={`0 0 ${width} 40`} className="min-w-[640px]">
            <g transform={`translate(${innerLeft},20)`}>
              {xScale.ticks(6).map((t) => (
                <g key={t} transform={`translate(${xScale(t)},0)`}>
                  <text
                    y={-4}
                    textAnchor="middle"
                    fill="var(--ink-faint)"
                    fontSize={10}
                    fontFamily="var(--font-mono)"
                  >
                    {t}
                  </text>
                </g>
              ))}
              <text
                x={innerW + 20}
                y={-4}
                fill="var(--ink-faint)"
                fontSize={9}
                fontFamily="var(--font-mono)"
              >
                mm
              </text>
            </g>
          </svg>

          <div
            className="relative min-w-[640px]"
            style={{ height, transition: "height 400ms ease" }}
          >
            {/* zero baseline */}
            <div
              className="absolute top-0 bottom-0 border-l border-dashed border-ink-faint/40"
              style={{ left: innerLeft + x0 }}
            />
            {seaLevelCountries.map((name) => {
              const c = seaLevelData[name];
              const pt = c.series.find((s) => s.year === year);
              const value = pt ? pt.value * 1000 : 0;
              const rank = countryRanks[name];
              const barLeft = innerLeft + xScale(Math.min(0, value));
              const barW = Math.max(
                Math.abs(xScale(value) - xScale(0)),
                1.5
              );
              const positive = value >= 0;
              return (
                <div
                  key={name}
                  className="absolute left-0 right-0 flex items-center"
                  style={{
                    top: rank * (ROW_H + ROW_GAP),
                    height: ROW_H,
                    transition: "top 700ms cubic-bezier(.4,0,.2,1)",
                  }}
                >
                  <div
                    className="absolute flex items-center gap-1.5"
                    style={{ left: 0, width: innerLeft - 10 }}
                  >
                    <span className="font-mono text-[10px] text-ink-faint w-5 text-right shrink-0">
                      {rank + 1}
                    </span>
                    <Flag iso2={c.iso2} className="w-4 h-3 shrink-0" />
                    <span className="font-mono text-[11px] text-ink truncate">
                      {shortName(name)}
                    </span>
                  </div>
                  <div
                    className="absolute rounded-sm"
                    style={{
                      left: barLeft,
                      width: barW,
                      height: ROW_H - 10,
                      background: palette.get(name),
                      opacity: 0.88,
                      transition:
                        "left 700ms cubic-bezier(.4,0,.2,1), width 700ms cubic-bezier(.4,0,.2,1), background 300ms",
                    }}
                  />
                  <div
                    className="absolute font-mono text-[11px] tabular-nums"
                    style={{
                      left: positive
                        ? barLeft + barW + 6
                        : barLeft - 6,
                      transform: positive ? "none" : "translateX(-100%)",
                      color: "var(--gold)",
                      transition: "left 700ms cubic-bezier(.4,0,.2,1)",
                    }}
                  >
                    {value >= 0 ? "+" : ""}
                    {value.toFixed(0)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Vertical YearScrubber for desktop */}
        <div className="hidden lg:block">
          <YearScrubber
            years={seaLevelYears}
            year={year}
            onChange={setYear}
            speedMs={1000}
            variant="vertical"
          />
        </div>

        {/* Horizontal YearScrubber for mobile */}
        <div className="lg:hidden col-span-full mt-6">
          <YearScrubber years={seaLevelYears} year={year} onChange={setYear} speedMs={1000} />
        </div>
      </div>
    </div>
        </section>
  );
}
