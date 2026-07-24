"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import {
  seaLevelData,
  seaLevelCountries,
  seaLevelYears,
  shortName,
} from "@/lib/data";
import { makePalette } from "@/lib/colors";
import YearScrubber from "@/components/ui/YearScrubber";
import Flag from "@/components/ui/Flag";


const MARGIN = { top: 24, right: 20, bottom: 32, left: 48 };
const DEFAULT_SELECTED = [
  "Tuvalu",
  "Kiribati",
  "Marshall Islands",
  "Fiji",
  "Papua New Guinea",
  "Tonga",
];

export default function Part1Chart1() {
  const palette = useMemo(() => makePalette(seaLevelCountries), []);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(DEFAULT_SELECTED)
  );
  const [year, setYear] = useState(seaLevelYears[seaLevelYears.length - 1]);
  const [hover, setHover] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(900);
  const height = 460;

  useEffect(() => {
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(e.contentRect.width);
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const innerW = Math.max(width - MARGIN.left - MARGIN.right, 100);
  const innerH = height - MARGIN.top - MARGIN.bottom;

  const x = useMemo(
    () =>
      d3
        .scaleLinear()
        .domain([seaLevelYears[0], seaLevelYears[seaLevelYears.length - 1]])
        .range([0, innerW]),
    [innerW]
  );

  const y = useMemo(
    () => d3.scaleLinear().domain([-250, 250]).range([innerH, 0]).nice(),
    [innerH]
  );

  const line = useMemo(
    () =>
      d3
        .line<{ year: number; value: number }>()
        .x((d) => x(d.year))
        .y((d) => y(d.value * 1000))
        .curve(d3.curveMonotoneX),
    [x, y]
  );

  const gxRef = useRef<SVGGElement>(null);
  const gyRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (gxRef.current) {
      d3.select(gxRef.current)
        .call(
          d3
            .axisBottom(x)
            .tickFormat((d) => String(d))
            .ticks(width < 500 ? 5 : 10)
        )
        .call((g) => g.selectAll("text").attr("fill", "var(--ink-faint)").attr("font-family", "var(--font-mono)").attr("font-size", 10))
        .call((g) => g.selectAll("line").attr("stroke", "var(--grid)"))
        .call((g) => g.select(".domain").attr("stroke", "var(--grid)"));
    }
    if (gyRef.current) {
      d3.select(gyRef.current)
        .call(d3.axisLeft(y).ticks(6).tickFormat((d) => `${d}`))
        .call((g) => g.selectAll("text").attr("fill", "var(--ink-faint)").attr("font-family", "var(--font-mono)").attr("font-size", 10))
        .call((g) => g.selectAll("line").attr("stroke", "var(--grid)"))
        .call((g) => g.select(".domain").remove());
    }
  }, [x, y, width]);

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const activeList =
    selected.size > 0 ? Array.from(selected) : seaLevelCountries;

  return (
    <section id="part1-chart1" className="relative bg-foam px-6 py-14 md:px-16">
      <div className="mx-auto max-w-6xl">
        <h1 className="font-display text-3xl sm:text-4xl text-ink max-w-3xl">
          Sea level rise, by year &amp; country
        </h1>
        <p className="mt-3 max-w-2xl text-sm sm:text-base text-ink-dim leading-relaxed">
          Sea level anomalies (relative to baseline) measured by satellite,
          1993–2023. Drag the slider or press Play to watch the measurement line
          &ldquo;draw&rdquo; over time — select countries below to compare.
        </p>

        <div className="mt-8 grid lg:grid-cols-[1fr_auto_260px] gap-4 items-start">
          {/* Chart */}
          <div ref={containerRef} className="chart-paper rounded-lg pr-3 sm:pr-5">
            <svg ref={svgRef} width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
              <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
                {/* horizontal gridlines at 0 emphasized */}
                <line
                  x1={0}
                  x2={innerW}
                  y1={y(0)}
                  y2={y(0)}
                  stroke="var(--ink-faint)"
                  strokeDasharray="2,3"
                  opacity={0.5}
                />
                <g ref={gyRef} />
                <g ref={gxRef} transform={`translate(0,${innerH})`} />

                {/* reveal clip based on current year */}
                <clipPath id="reveal-clip">
                  <rect
                    x={0}
                    y={-20}
                    width={Math.max(x(year), 0)}
                    height={innerH + 40}
                  />
                </clipPath>

                <g clipPath="url(#reveal-clip)">
                  {seaLevelCountries.map((name) => {
                    const d = seaLevelData[name];
                    const isActive = activeList.includes(name);
                    const isHover = hover === name;
                    return (
                      <path
                        key={name}
                        d={line(d.series) ?? ""}
                        fill="none"
                        stroke={palette.get(name)}
                        strokeWidth={isHover ? 3.5 : isActive ? 2 : 1}
                        opacity={
                          !isActive ? 0.08 : isHover ? 1 : hover ? 0.35 : 0.85
                        }
                        style={{ transition: "opacity 180ms, stroke-width 180ms" }}
                        onMouseEnter={() => setHover(name)}
                        onMouseLeave={() => setHover(null)}
                      />
                    );
                  })}
                </g>

                {/* current-year markers */}
                {seaLevelCountries.map((name) => {
                  const d = seaLevelData[name];
                  const pt = d.series.find((s) => s.year === year);
                  if (!pt) return null;
                  const isActive = activeList.includes(name);
                  if (!isActive) return null;
                  const isHover = hover === name;
                  return (
                    <g
                      key={name}
                      style={{ transition: "transform 220ms ease" }}
                      transform={`translate(${x(pt.year)},${y(pt.value * 1000)})`}
                    >
                      <circle
                        r={isHover ? 5.5 : 3.5}
                        fill={palette.get(name)}
                        stroke="var(--paper-raised)"
                        strokeWidth={1.5}
                        onMouseEnter={() => setHover(name)}
                        onMouseLeave={() => setHover(null)}
                        style={{ cursor: "pointer" }}
                      />
                    </g>
                  );
                })}

                {/* Popovers - positioned at chart level */}
                {seaLevelCountries.map((name) => {
                  const d = seaLevelData[name];
                  const pt = d.series.find((s) => s.year === year);
                  if (!pt) return null;
                  const isActive = activeList.includes(name);
                  if (!isActive) return null;
                  const isHover = hover === name;
                  return (
                    <g key={`tooltip-${name}`}>
                      {isHover && (
                        <g transform={`translate(${innerW / 2},${MARGIN.top - 25})`}>
                          <rect
                            x={-Math.max(shortName(name).length * 6.2 + 44, 90) / 2}
                            y={-14}
                            width={Math.max(shortName(name).length * 6.2 + 44, 90)}
                            height={24}
                            rx={4}
                            fill="white"
                            stroke="var(--grid)"
                            strokeWidth={1}
                          />
                          <text
                            x={-Math.max(shortName(name).length * 6.2 + 44, 90) / 2 + 8}
                            y={2}
                            fill="var(--ink)"
                            fontSize={11}
                            fontFamily="var(--font-body)"
                          >
                            {shortName(name)}
                          </text>
                          <text
                            x={Math.max(shortName(name).length * 6.2 + 44, 90) / 2 - 8}
                            y={2}
                            textAnchor="end"
                            fill="var(--gold)"
                            fontSize={11}
                            fontFamily="var(--font-mono)"
                          >
                            {(pt.value * 1000).toFixed(0)}mm
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}

                <text
                  x={-MARGIN.left + 4}
                  y={-10}
                  fill="var(--ink-faint)"
                  fontSize={10}
                  fontFamily="var(--font-mono)"
                >
                  mm
                </text>
              </g>
            </svg>
          </div>

          {/* Vertical YearScrubber (desktop only) */}
          <div className="hidden lg:block">
            <YearScrubber
              years={seaLevelYears}
              year={year}
              onChange={setYear}
              speedMs={2000}
              variant="vertical"
            />
          </div>

          {/* Country picker */}
          <div className="chart-paper rounded-lg p-4 h-fit sticky top-24">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-faint">
                Countries ({activeList.length}/{seaLevelCountries.length})
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelected(new Set(seaLevelCountries))}
                  className="font-mono text-[10px] text-tide hover:text-tide-2"
                >
                  all
                </button>
                <button
                  onClick={() => setSelected(new Set())}
                  className="font-mono text-[10px] text-coral hover:opacity-80"
                >
                  clear
                </button>
              </div>
            </div>
            <div className="max-h-[440px] lg:max-h-[500px] overflow-y-auto pr-1 flex flex-col gap-0.5">
              {seaLevelCountries.map((name) => {
                const isActive = activeList.includes(name);
                const d = seaLevelData[name];
                return (
                  <button
                    key={name}
                    onClick={() => toggle(name)}
                    onMouseEnter={() => setHover(name)}
                    onMouseLeave={() => setHover(null)}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors ${
                      isActive ? "bg-paper-raised-2" : "opacity-45 hover:opacity-80"
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: palette.get(name) }}
                    />
                    <Flag iso2={d.iso2} className="w-4 h-3 shrink-0" />
                    <span className="font-mono text-[11px] text-ink truncate">
                      {shortName(name)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Horizontal YearScrubber (mobile only) */}
          <div className="lg:hidden col-span-full">
            <YearScrubber years={seaLevelYears} year={year} onChange={setYear} speedMs={2000} />
          </div>
        </div>
      </div>
    </section>
  );
}
