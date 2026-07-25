"use client";

import { useMemo, useState } from "react";
import * as d3 from "d3";
import { correlationMatrix, getIndicatorLabel } from "@/lib/data";
import YearScrubber from "@/components/ui/YearScrubber";


export default function CorrelationPage() {
  const { years, variables, varLabels, windowSize, minPoints, matrices } =
    correlationMatrix;
  const [year, setYear] = useState(years[years.length - 1]);
  const [hoverCell, setHoverCell] = useState<[number, number] | null>(null);

  // Translate Vietnamese labels to English
  const translatedVarLabels = useMemo(() => {
    return Object.fromEntries(
      Object.entries(varLabels).map(([key, vietnamese]) => [key, getIndicatorLabel(vietnamese)])
    );
  }, [varLabels]);

  // Custom color function: red warning for high correlations (0.7-0.99), dark for 1.0, normal scale otherwise
  const getCorrelationColor = (r: number | null): string => {
    if (r === null) return "#0c1e2c"; // dark for null
    if (Math.abs(r) >= 0.999) return "#0c1e2c"; // keep dark for 1.0
    if (Math.abs(r) >= 0.7) {
      // Red warning scale for high correlations (0.7-0.99)
      const intensity = (Math.abs(r) - 0.7) / 0.29; // 0 to 1
      return r > 0
        ? d3.interpolateRgb("#ff6b6b", "#cc0000")(intensity) // red scale for positive
        : d3.interpolateRgb("#ff8888", "#ff3333")(intensity); // lighter red for negative
    }
    // Normal scale for lower correlations
    if (r < 0) {
      if (r < -0.5) return "var(--coral)";
      return d3.interpolateRgb("#f5f5f5", "#d65c5c")(Math.abs(r) / 0.5);
    }
    if (r > 0.5) return "#6b9bd2";
    return d3.interpolateRgb("#f5f5f5", "#6b9bd2")(r / 0.5);
  };

  const cell = matrices[String(year)];
  const cellSize = 96;
  const gridSize = variables.length * cellSize;
  const margin = { top: 25, left: 140 };

  return (
    <div id="correlation-section">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-6 sm:py-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-tide mb-3">
          Analysis Station &middot; Correlation Matrix
        </p>
        <h2 className="font-display text-2xl sm:text-3xl text-ink max-w-3xl">
          How are sea level and clean water indicators correlated over years?
        </h2>
        <p className="mt-3 max-w-2xl text-sm sm:text-base text-ink-dim leading-relaxed">
          Because sea level is nearly uniform across countries within the same year
          (it's a regional signal, not a country-level difference), correlation
          "cross-country" in a single year is nearly meaningless. Instead, this chart
          computes the Pearson correlation coefficient between{" "}
          <strong className="text-ink">regional average time series</strong> of
          each indicator, in a <strong className="text-ink">{windowSize}-year
          rolling window</strong> up to each year — showing how relationships form
          and evolve as more data arrives.
        </p>

        <div className="mt-8 grid lg:grid-cols-[1fr_320px] gap-6">
          <div className="chart-paper rounded-lg p-4 sm:p-6 overflow-x-auto">
            <svg
              width={gridSize + margin.left + 20}
              height={gridSize + margin.top + 40}
              viewBox={`0 0 ${gridSize + margin.left + 20} ${gridSize + margin.top + 40}`}
              className="min-w-[560px]"
            >
              <g transform={`translate(${margin.left},${margin.top})`}>
                {/* column labels - horizontal, smaller font */}
                {variables.map((v, j) => {
                  const labelX = j * cellSize + cellSize / 2;
                  const labelY = -8;
                  return (
                    <text
                      key={`col-${v}`}
                      x={labelX}
                      y={labelY}
                      textAnchor="middle"
                      fontSize={9}
                      fontFamily="var(--font-mono)"
                      fill={j === 0 ? "var(--brass-bright)" : "var(--ink-dim)"}
                      fontWeight={j === 0 ? 600 : 500}
                    >
                      {translatedVarLabels[v]}
                    </text>
                  );
                })}
                {/* row labels */}
                {variables.map((v, i) => (
                  <text
                    key={`row-${v}`}
                    x={-10}
                    y={i * cellSize + cellSize / 2 + 4}
                    textAnchor="end"
                    fontSize={10}
                    fontFamily="var(--font-mono)"
                    fill={i === 0 ? "var(--brass-bright)" : "var(--ink-dim)"}
                    fontWeight={i === 0 ? 600 : 400}
                  >
                    {translatedVarLabels[v]}
                  </text>
                ))}

                {variables.map((vi, i) =>
                  variables.map((vj, j) => {
                    const r = cell?.r[i]?.[j] ?? null;
                    const isHover = hoverCell?.[0] === i && hoverCell?.[1] === j;
                    return (
                      <g
                        key={`${vi}-${vj}`}
                        transform={`translate(${j * cellSize},${i * cellSize})`}
                        onMouseEnter={() => setHoverCell([i, j])}
                        onMouseLeave={() => setHoverCell(null)}
                      >
                        <rect
                          width={cellSize - 3}
                          height={cellSize - 3}
                          rx={5}
                          fill={getCorrelationColor(r)}
                          stroke={isHover ? "var(--brass-bright)" : "rgba(238,242,238,0.15)"}
                          strokeWidth={isHover ? 2.5 : 1}
                          style={{ transition: "fill 500ms ease" }}
                        />
                        <text
                          x={(cellSize - 3) / 2}
                          y={(cellSize - 3) / 2 + 5}
                          textAnchor="middle"
                          fontSize={15}
                          fontFamily="var(--font-mono)"
                          fill={
                            r === null
                              ? "var(--ink-faint)"
                              : Math.abs(r) >= 0.999
                              ? "#fff" // white text for dark 1.0 cells
                              : Math.abs(r) >= 0.7
                              ? "#fff" // white text for red warning cells
                              : Math.abs(r) < 0.3
                              ? "#2d3a45"
                              : r < 0
                              ? "#0a141f"
                              : "#0a141f"
                          }
                          fontWeight={i === j ? 400 : 600}
                        >
                          {r === null ? "—" : r.toFixed(2)}
                        </text>
                      </g>
                    );
                  })
                )}
              </g>
            </svg>
          </div>

          <div className="flex flex-col gap-4">
            <YearScrubber years={years} year={year} onChange={setYear} speedMs={1000} label="Year" variant="vertical" />

            <div className="chart-paper rounded-lg p-5">
              <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-faint block mb-3">
                Rolling window to year {year}
              </span>
              <p className="font-mono text-[15px] text-brass-bright font-semibold">
                {cell?.windowYears[0]} – {cell?.windowYears[cell.windowYears.length - 1]}
              </p>
              <p className="font-mono text-[11px] text-ink-dim mt-2 leading-relaxed">
                {cell && cell.windowYears.length < minPoints
                  ? `Only ${cell.windowYears.length} points — insufficient for reliable correlation (need ${minPoints} minimum).`
                  : `${cell?.windowYears.length ?? 0} data points in window.`}
              </p>
            </div>

            {hoverCell && cell?.r[hoverCell[0]]?.[hoverCell[1]] !== null && cell?.r[hoverCell[0]]?.[hoverCell[1]] !== undefined && (
              <div className="chart-paper rounded-lg p-5">
                <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-faint block mb-3">
                  Selected cell detail
                </span>
                <p className="text-sm text-ink leading-relaxed font-medium">
                  {translatedVarLabels[variables[hoverCell[0]]]} &harr;{" "}
                  {translatedVarLabels[variables[hoverCell[1]]]}
                </p>
                <p className="font-mono text-[28px] text-brass-bright mt-2 font-semibold">
                  r = {cell?.r[hoverCell[0]]?.[hoverCell[1]]?.toFixed(3)}
                </p>
              </div>
            )}

            <div className="chart-paper rounded-lg p-5">
              <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-faint block mb-3">
                Color scale
              </span>
              <div className="h-4 rounded-full mb-2" style={{
                background: "linear-gradient(90deg, var(--coral), #d65c5c, #f5f5f5, #6b9bd2, #ff6b6b, #cc0000, #0c1e2c)"
              }} />
              <div className="flex justify-between font-mono text-[10px] text-ink-dant">
                <span className="font-semibold">-1.0 negative</span>
                <span className="font-semibold">0</span>
                <span className="font-semibold text-red-600">+0.7 high</span>
                <span className="font-semibold">+1.0</span>
              </div>
              <div className="font-mono text-[9px] text-ink-faint mt-2 leading-relaxed">
                <span className="text-red-500 font-semibold">■</span> Red warning: strong correlation (≥0.7)
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 font-mono text-[11px] text-ink-faint max-w-2xl leading-relaxed">
          Statistical note: correlations are between short time series (max {windowSize} points/year) —
          enough to suggest co-movement/opposite trends, but small sample sizes mean
          coefficients can fluctuate widely and <strong className="text-ink-dim">do not imply causation</strong>.
        </p>
      </div>
    </div>
  );
}
