"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import {
  ghgData,
  tempAnomalyData,
  seaLevelData,
  CORRELATION_YEARS,
  shortName,
} from "@/lib/data";
import { makePalette } from "@/lib/colors";
import Flag from "@/components/ui/Flag";
import YearScrubber from "@/components/ui/YearScrubber";

// ─── helpers ────────────────────────────────────────────────────────────────

/** sea-level name → GHG/temp name */
const SL_TO_NORM: Record<string, string> = {
  "Micronesia, Federated State of": "Micronesia",
};

/** Countries present in all three datasets */
const COUNTRIES: Array<{
  slName: string;  // key in seaLevelData
  normName: string; // key in ghg/temp
  iso2: string;
}> = (() => {
  const ghgByName = new Map(ghgData.map((d) => [d.name, d]));
  const tempByName = new Map(tempAnomalyData.map((d) => [d.name, d]));
  const result = [];
  for (const slName of Object.keys(seaLevelData)) {
    const normName = SL_TO_NORM[slName] ?? slName;
    if (ghgByName.has(normName) && tempByName.has(normName)) {
      result.push({ slName, normName, iso2: seaLevelData[slName].iso2 });
    }
  }
  return result;
})();

const COUNTRY_NAMES = COUNTRIES.map((c) => c.slName);

/** Lookup helpers */
const ghgByName = new Map(ghgData.map((d) => [d.name, d]));
const tempByName = new Map(tempAnomalyData.map((d) => [d.name, d]));

function getGhg(normName: string, year: number): number | null {
  const series = ghgByName.get(normName)?.series ?? [];
  return series.find((s) => s.year === year)?.value ?? null;
}

function getTemp(normName: string, year: number): number | null {
  const series = tempByName.get(normName)?.series ?? [];
  return series.find((s) => s.year === year)?.value ?? null;
}

function getSeaLevel(slName: string, year: number): number | null {
  const series = seaLevelData[slName]?.series ?? [];
  const pt = series.find((s) => s.year === year);
  return pt !== undefined ? pt.value * 1000 : null; // convert m → mm
}

// ─── Pearson r (pure function, outside component) ───────────────────────────
// Formula: r(X,Y) = Σ(xi - x̄)(yi - ȳ) / sqrt[Σ(xi-x̄)² · Σ(yi-ȳ)²]
// Inputs must be raw linear values (not scaled/transformed).
function pearsonR(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 3) return NaN;
  const meanX = xs.reduce((s, x) => s + x, 0) / n;
  const meanY = ys.reduce((s, y) => s + y, 0) / n;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num  += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  return denX === 0 || denY === 0 ? 0 : num / Math.sqrt(denX * denY);
}

// ─── component ──────────────────────────────────────────────────────────────

const MARGIN = { top: 32, right: 32, bottom: 58, left: 68 };
const TRAIL_LEN = 6; // number of trail positions to show

export default function CorrelationBubble() {
  const palette = useMemo(() => makePalette(COUNTRY_NAMES), []);
  const [year, setYear] = useState(CORRELATION_YEARS[CORRELATION_YEARS.length - 1]);
  const [hover, setHover] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(820);

  useEffect(() => {
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(e.contentRect.width);
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // ── scales (stable across years) ──────────────────────────────────────────
  const height = Math.min(500, Math.max(340, width * 0.56));
  const innerW = width - MARGIN.left - MARGIN.right;
  const innerH = height - MARGIN.top - MARGIN.bottom;

  const { xScale, yScale, rScale } = useMemo(() => {
    // collect all data points across all years for stable axes
    const ghgVals: number[] = [];
    const slVals: number[] = [];
    const tempVals: number[] = [];

    for (const yr of CORRELATION_YEARS) {
      for (const { slName, normName } of COUNTRIES) {
        const g = getGhg(normName, yr);
        const s = getSeaLevel(slName, yr);
        const t = getTemp(normName, yr);
        if (g !== null) ghgVals.push(g);
        if (s !== null) slVals.push(s);
        if (t !== null) tempVals.push(t);
      }
    }

    const xScale = d3
      .scalePow()
      .exponent(0.45)  // sqrt-like, spreads small values while keeping outliers visible
      .domain([0, (d3.max(ghgVals) ?? 5) * 1.05])
      .range([0, innerW])
      .nice();

    const [slMin, slMax] = d3.extent(slVals) as [number, number];
    const yPad = (slMax - slMin) * 0.15 || 5;
    const yScale = d3
      .scaleLinear()
      .domain([slMin - yPad, slMax + yPad])
      .range([innerH, 0]);

    const [tMin, tMax] = d3.extent(tempVals) as [number, number];
    const rScale = d3
      .scaleSqrt()
      .domain([tMin, tMax])
      .range([5, 22]);

    return { xScale, yScale, rScale };
  }, [innerW, innerH]);

  // ── per-frame data ──────────────────────────────────────────────────────────
  const points = useMemo(() => {
    return COUNTRIES.map(({ slName, normName, iso2 }) => {
      const ghg = getGhg(normName, year);
      const sl = getSeaLevel(slName, year);
      const temp = getTemp(normName, year);

      // trail: last TRAIL_LEN years
      const trail = CORRELATION_YEARS.filter((y) => y <= year)
        .slice(-TRAIL_LEN)
        .map((y) => ({
          year: y,
          ghg: getGhg(normName, y),
          sl: getSeaLevel(slName, y),
        }))
        .filter((pt) => pt.ghg !== null && pt.sl !== null);

      return { slName, normName, iso2, ghg, sl, temp, trail };
    });
  }, [year]);

  // ── tooltip format ─────────────────────────────────────────────────────────
  const hovered = hover ? points.find((p) => p.slName === hover) : null;


  // ── All-pairs correlations + OLS regression line for GHG ↔ Sea Level ───────

  const correlation = useMemo(() => {
    // Only observations where ALL three values exist
    const full = points.filter(
      (p) => p.ghg !== null && p.sl !== null && p.temp !== null
    ) as Array<{ ghg: number; sl: number; temp: number; slName: string }>;
    const n = full.length;
    if (n < 3) return null;

    const ghgArr  = full.map((p) => p.ghg);
    const slArr   = full.map((p) => p.sl);
    const tempArr = full.map((p) => p.temp);

    const rGhgSl   = pearsonR(ghgArr,  slArr);
    const rGhgTemp = pearsonR(ghgArr,  tempArr);
    const rTempSl  = pearsonR(tempArr, slArr);

    // OLS for GHG → Sea Level (to draw the regression line on the scatter axes)
    const meanGhg = ghgArr.reduce((s, x) => s + x, 0) / n;
    const meanSl  = slArr.reduce((s, y) => s + y, 0) / n;
    let numGS = 0, denGS = 0;
    for (let i = 0; i < n; i++) {
      const dx = ghgArr[i] - meanGhg;
      numGS += dx * (slArr[i] - meanSl);
      denGS += dx * dx;
    }
    const slope     = denGS === 0 ? 0 : numGS / denGS;
    const intercept = meanSl - slope * meanGhg;

    const xMin = Math.max(0, (d3.min(ghgArr) ?? 0) - 0.2);
    const xMax = (d3.max(ghgArr) ?? 5) + 0.5;
    const [domainMin, domainMax] = yScale.domain();
    const clamp = (v: number) => Math.max(domainMin, Math.min(domainMax, v));

    return {
      rGhgSl,
      rGhgTemp,
      rTempSl,
      n,
      line: {
        x1: xScale(xMin), y1: yScale(clamp(slope * xMin + intercept)),
        x2: xScale(xMax), y2: yScale(clamp(slope * xMax + intercept)),
      },
    };
  }, [points, xScale, yScale]);


  return (
    <section
      id="part1-correlation"
      className="relative px-6 py-14 md:px-16"
    >
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex flex-wrap gap-6 items-start justify-between">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl  max-w-3xl">
              The Climate Triangle
            </h2>
            <p className="mt-3 max-w-2xl text-sm sm:text-base leading-relaxed">
              How GHG emissions, sea‑level rise and temperature anomaly move
              together across Pacific nations. Bubble size encodes temperature
              anomaly (°C above pre‑industrial). Press&nbsp;
              <span className="text-lagoon font-semibold">Play</span> to animate
              1993 → 2023.
            </p>
            {/* ── Three-pair correlation badges ── */}
            {correlation && (
              <div className="mt-4 flex flex-wrap gap-2">
                {([
                  { label: "GHG ↔ Sea Level", r: correlation.rGhgSl,   note: "(axes)" },
                  { label: "GHG ↔ Temp",      r: correlation.rGhgTemp, note: "(color)" },
                  { label: "Temp ↔ Sea Level", r: correlation.rTempSl,  note: "" },
                ] as const).map(({ label, r, note }) => (
                  <div
                    key={label}
                    className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-paper/60 px-3 py-1 backdrop-blur"
                  >
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-faint">
                      {label}
                    </span>
                    <span
                      className="font-mono text-[13px] font-bold tabular-nums"
                      style={{
                        color:
                          Math.abs(r) > 0.6 ? "#4ade80"
                          : Math.abs(r) > 0.3 ? "var(--gold)"
                          : "var(--ink-dim)",
                      }}
                    >
                      {r >= 0 ? "+" : ""}{r.toFixed(3)}
                    </span>
                    <span className="font-mono text-[9px] text-ink-faint">
                      {Math.abs(r) > 0.7 ? "strong"
                        : Math.abs(r) > 0.4 ? "moderate"
                        : Math.abs(r) > 0.2 ? "weak"
                        : "negligible"}{" "}
                      {r > 0 ? "↑" : "↓"}
                      {note && <span className="text-ink-faint/60 ml-1">{note}</span>}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Legend: bubble size */}
          <div className="chart-paper rounded-lg px-4 py-3 flex flex-col gap-2 shrink-0">
            <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-faint">
              Bubble size = Temp anomaly
            </span>
            <div className="flex items-end gap-3">
              {[2.5, 3.0, 3.5, 4.0].map((t) => {
                const r = rScale(t);
                return (
                  <div key={t} className="flex flex-col items-center gap-1">
                    <svg width={r * 2} height={r * 2}>
                      <circle
                        cx={r}
                        cy={r}
                        r={r - 1}
                        fill="none"
                        stroke="var(--lagoon)"
                        strokeWidth={1.5}
                        opacity={0.7}
                      />
                    </svg>
                    <span className="font-mono text-[9px] text-ink-faint">
                      {t}°
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-8 grid lg:grid-cols-[1fr_auto_200px] gap-4 items-start">
          {/* ── Chart ── */}
          <div ref={containerRef} className="chart-paper rounded-xl overflow-hidden relative">
            {/* Tooltip card */}
            {hovered && hovered.ghg !== null && hovered.sl !== null && (
              <div className="absolute top-3 left-3 z-10 rounded-lg bg-ocean-deep/90 border border-foam/10 px-3 py-2 backdrop-blur-sm pointer-events-none">
                <div className="flex items-center gap-2 mb-1">
                  <Flag iso2={hovered.iso2} className="w-5 h-3.5 shrink-0" />
                  <span className="font-mono text-xs font-semibold text-foam">
                    {shortName(hovered.slName)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                  <span className="font-mono text-[10px] text-foam/50">GHG</span>
                  <span className="font-mono text-[10px] text-gold tabular-nums">
                    {hovered.ghg!.toFixed(2)} t CO₂eq
                  </span>
                  <span className="font-mono text-[10px] text-foam/50">Sea level</span>
                  <span className="font-mono text-[10px] text-lagoon tabular-nums">
                    {hovered.sl! >= 0 ? "+" : ""}{hovered.sl!.toFixed(0)} mm
                  </span>
                  {hovered.temp !== null && (
                    <>
                      <span className="font-mono text-[10px] text-foam/50">Temp Δ</span>
                      <span className="font-mono text-[10px] text-coral tabular-nums">
                        {hovered.temp!.toFixed(2)} °C
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}

            <svg
              width="100%"
              height={height}
              viewBox={`0 0 ${width} ${height}`}
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <radialGradient id="bubble-glow" cx="35%" cy="30%" r="60%">
                  <stop offset="0%" stopColor="white" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="white" stopOpacity={0} />
                </radialGradient>
              </defs>

              <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
                {/* ── Grid ── */}
                {yScale.ticks(5).map((t) => (
                  <line
                    key={`gy-${t}`}
                    x1={0}
                    x2={innerW}
                    y1={yScale(t)}
                    y2={yScale(t)}
                    stroke="var(--ink-faint)"
                    strokeWidth={0.4}
                    opacity={0.3}
                  />
                ))}
                {xScale.ticks(5).map((t) => (
                  <line
                    key={`gx-${t}`}
                    x1={xScale(t)}
                    x2={xScale(t)}
                    y1={0}
                    y2={innerH}
                    stroke="var(--ink-faint)"
                    strokeWidth={0.4}
                    opacity={0.3}
                  />
                ))}

                {/* ── Zero lines ── */}
                <line
                  x1={0}
                  x2={innerW}
                  y1={yScale(0)}
                  y2={yScale(0)}
                  stroke="var(--lagoon)"
                  strokeWidth={1}
                  strokeDasharray="4,5"
                  opacity={0.35}
                />
                <text
                  x={innerW + 4}
                  y={yScale(0) + 4}
                  fontSize={9}
                  fontFamily="var(--font-mono)"
                  fill="var(--lagoon)"
                  opacity={0.6}
                >
                  baseline
                </text>

                {/* ── X Axis ── */}
                <g transform={`translate(0,${innerH})`}>
                  <line x1={0} x2={innerW} stroke="var(--ink-faint)" strokeWidth={0.6} opacity={0.5} />
                  {xScale.ticks(5).map((t) => (
                    <g key={t} transform={`translate(${xScale(t)},0)`}>
                      <line y1={0} y2={5} stroke="var(--ink-faint)" strokeWidth={0.6} opacity={0.5} />
                      <text
                        y={16}
                        textAnchor="middle"
                        fontSize={9}
                        fontFamily="var(--font-mono)"
                        fill="var(--ink-faint)"
                      >
                        {t}
                      </text>
                    </g>
                  ))}
                  <text
                    x={innerW / 2}
                    y={38}
                    textAnchor="middle"
                    fontSize={10}
                    fontFamily="var(--font-mono)"
                    fill="var(--ink-faint)"
                  >
                    GHG per capita (t CO₂ eq · power scale)
                  </text>
                </g>

                {/* ── Y Axis ── */}
                <g>
                  <line y1={0} y2={innerH} stroke="var(--ink-faint)" strokeWidth={0.6} opacity={0.5} />
                  {yScale.ticks(5).map((t) => (
                    <g key={t} transform={`translate(0,${yScale(t)})`}>
                      <line x1={-5} x2={0} stroke="var(--ink-faint)" strokeWidth={0.6} opacity={0.5} />
                      <text
                        x={-10}
                        y={4}
                        textAnchor="end"
                        fontSize={9}
                        fontFamily="var(--font-mono)"
                        fill="var(--ink-faint)"
                      >
                        {t >= 0 ? "+" : ""}{t}
                      </text>
                    </g>
                  ))}
                  <text
                    transform={`rotate(-90) translate(${-innerH / 2},${-52})`}
                    textAnchor="middle"
                    fontSize={10}
                    fontFamily="var(--font-mono)"
                    fill="var(--ink-faint)"
                  >
                    Sea level anomaly (mm)
                  </text>
                </g>

                {/* ── Year watermark ── */}
                <text
                  x={innerW - 8}
                  y={innerH - 8}
                  textAnchor="end"
                  fontSize={48}
                  fontFamily="var(--font-display)"
                  fill="var(--lagoon)"
                  opacity={0.07}
                  fontWeight={700}
                  style={{ userSelect: "none" }}
                >
                  {year}
                </text>

                {/* ── Trails ── */}
                {points.map(({ slName, trail }) => {
                  const color = palette.get(slName) ?? "#888";
                  const trailPts = trail.filter(
                    (pt) => pt.ghg !== null && pt.sl !== null
                  );
                  if (trailPts.length < 2) return null;
                  const pathD = d3
                    .line<(typeof trailPts)[0]>()
                    .x((pt) => xScale(pt.ghg!))
                    .y((pt) => yScale(pt.sl!))
                    .curve(d3.curveCatmullRom.alpha(0.5))(trailPts);
                  return (
                    <path
                      key={`trail-${slName}`}
                      d={pathD ?? ""}
                      fill="none"
                      stroke={color}
                      strokeWidth={hover === slName ? 2 : 1}
                      opacity={hover && hover !== slName ? 0.05 : hover === slName ? 0.7 : 0.25}
                      strokeLinecap="round"
                      style={{ transition: "opacity 200ms" }}
                    />
                  );
                })}

                {/* ── Regression line (OLS: GHG → Sea Level) ── */}
                {correlation && (
                  <g style={{ transition: "opacity 300ms" }} opacity={hover ? 0.2 : 1}>
                    <line
                      x1={correlation.line.x1}
                      y1={correlation.line.y1}
                      x2={correlation.line.x2}
                      y2={correlation.line.y2}
                      stroke="#f87171"
                      strokeWidth={1.5}
                      strokeDasharray="6,4"
                      opacity={0.65}
                      style={{ transition: "x1 700ms ease, y1 700ms ease, x2 700ms ease, y2 700ms ease" }}
                    />
                    <text
                      x={(correlation.line.x1 + correlation.line.x2) / 2 + 8}
                      y={(correlation.line.y1 + correlation.line.y2) / 2 - 8}
                      fontSize={9}
                      fontFamily="var(--font-mono)"
                      fill="#f87171"
                      opacity={0.75}
                      style={{ transition: "x 700ms ease, y 700ms ease" }}
                    >
                      OLS · r={correlation.rGhgSl >= 0 ? "+" : ""}{correlation.rGhgSl.toFixed(2)}
                    </text>
                  </g>
                )}

                {/* ── Bubbles ── */}
                {points
                  .slice()
                  .sort((a, b) => {
                    // render hovered last (on top)
                    if (a.slName === hover) return 1;
                    if (b.slName === hover) return -1;
                    return (b.temp ?? 0) - (a.temp ?? 0); // larger → render first
                  })
                  .map(({ slName, iso2, ghg, sl, temp }) => {
                    if (ghg === null || sl === null) return null;
                    const cx = xScale(ghg);
                    const cy = yScale(sl);
                    const r = temp !== null ? rScale(temp) : 8;
                    const color = palette.get(slName) ?? "#888";
                    const isHover = hover === slName;

                    return (
                      <g
                        key={slName}
                        transform={`translate(${cx},${cy})`}
                        style={{
                          transition: "transform 700ms cubic-bezier(.4,0,.2,1)",
                          cursor: "pointer",
                        }}
                        onMouseEnter={() => setHover(slName)}
                        onMouseLeave={() => setHover(null)}
                      >
                        {/* Glow ring for hovered */}
                        {isHover && (
                          <circle
                            r={r + 8}
                            fill="none"
                            stroke={color}
                            strokeWidth={1.5}
                            opacity={0.35}
                            style={{ transition: "r 250ms" }}
                          />
                        )}
                        {/* Main bubble */}
                        <circle
                          r={isHover ? r + 3 : r}
                          fill={color}
                          fillOpacity={isHover ? 0.92 : hover ? 0.2 : 0.75}
                          stroke={color}
                          strokeWidth={isHover ? 2 : 1}
                          strokeOpacity={isHover ? 1 : 0.6}
                          style={{ transition: "r 350ms ease, fill-opacity 180ms" }}
                        />
                        {/* Shine */}
                        <circle
                          r={isHover ? r + 3 : r}
                          fill="url(#bubble-glow)"
                          style={{ transition: "r 350ms ease" }}
                          pointerEvents="none"
                        />
                        {/* Country label (show when hovered or zoom big enough) */}
                        {(isHover || r > 14) && (
                          <text
                            y={-r - 5}
                            textAnchor="middle"
                            fontSize={isHover ? 11 : 9}
                            fontFamily="var(--font-mono)"
                            fill={color}
                            opacity={hover && !isHover ? 0.2 : 1}
                            style={{ pointerEvents: "none", transition: "opacity 180ms" }}
                          >
                            {shortName(slName)}
                          </text>
                        )}
                      </g>
                    );
                  })}
              </g>
            </svg>
          </div>

          {/* ── Vertical YearScrubber (desktop) ── */}
          <div className="hidden lg:block">
            <YearScrubber
              years={CORRELATION_YEARS}
              year={year}
              onChange={setYear}
              speedMs={850}
              variant="vertical"
            />
          </div>

          {/* ── Country legend (desktop) ── */}
          <div className="chart-paper rounded-xl p-4 h-fit lg:sticky lg:top-24">
            <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-faint block mb-3">
              Countries
            </span>
            <div className="flex flex-col gap-0.5 max-h-[440px] overflow-y-auto pr-1">
              {COUNTRIES.map(({ slName, iso2 }) => (
                <button
                  key={slName}
                  onMouseEnter={() => setHover(slName)}
                  onMouseLeave={() => setHover(null)}
                  className="flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-paper-raised-2 transition-colors"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: palette.get(slName) }}
                  />
                  <Flag iso2={iso2} className="w-4 h-3 shrink-0" />
                  <span className="font-mono text-[10px] text-ink truncate">
                    {shortName(slName)}
                  </span>
                </button>
              ))}
            </div>

            {/* Global trend mini stats */}
            <div className="mt-4 pt-3 border-t border-ink/10 grid gap-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-faint">
                Pacific avg · {year}
              </span>
              {(() => {
                const seaAvgPts = points.filter((p) => p.sl !== null);
                const ghgAvgPts = points.filter((p) => p.ghg !== null);
                const tempAvgPts = points.filter((p) => p.temp !== null);
                const seaAvg =
                  seaAvgPts.reduce((s, p) => s + p.sl!, 0) / (seaAvgPts.length || 1);
                const ghgAvg =
                  ghgAvgPts.reduce((s, p) => s + p.ghg!, 0) / (ghgAvgPts.length || 1);
                const tempAvg =
                  tempAvgPts.reduce((s, p) => s + p.temp!, 0) / (tempAvgPts.length || 1);
                return (
                  <>
                    <StatRow label="Sea level" value={`${seaAvg >= 0 ? "+" : ""}${seaAvg.toFixed(0)} mm`} color="var(--lagoon)" />
                    <StatRow label="GHG/cap" value={`${ghgAvg.toFixed(2)} t`} color="var(--gold)" />
                    <StatRow label="Temp Δ" value={`${tempAvg.toFixed(2)} °C`} color="#f87171" />
                  </>
                );
              })()}
            </div>
          </div>

          {/* ── Horizontal YearScrubber (mobile) ── */}
          <div className="lg:hidden col-span-full">
            <YearScrubber
              years={CORRELATION_YEARS}
              year={year}
              onChange={setYear}
              speedMs={850}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function StatRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-mono text-[10px] text-ink-faint">{label}</span>
      <span
        className="font-mono text-[11px] font-semibold tabular-nums"
        style={{ color }}
      >
        {value}
      </span>
    </div>
  );
}
