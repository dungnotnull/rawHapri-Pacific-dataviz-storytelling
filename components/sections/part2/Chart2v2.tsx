"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cleanWaterData, shortName } from "@/lib/data";
import { makePalette, NEUTRAL_LINE } from "@/lib/colors";
import Flag from "@/components/ui/Flag";


const SCATTER_COUNTRIES = Object.keys(cleanWaterData).filter(
  (name) =>
    cleanWaterData[name].urban.length > 0 && cleanWaterData[name].rural.length > 0
);

const YEAR_EARLY = 2016;
const YEAR_LATE = 2024;

interface Step {
  kicker: string;
  text: string;
  align: "left" | "right";
}

const steps: Step[] = [
  {
    kicker: "01 — HOW TO READ",
    text: "Each dot is one country. X-axis shows rural population with safely managed drinking water, Y-axis shows urban — both in %, year 2024.",
    align: "left",
  },
  {
    kicker: "02 — THE PATTERN",
    text: "All 7 countries with disaggregated data fall ABOVE the diagonal — meaning in every country without exception, urban access to safe water is always higher than rural.",
    align: "right",
  },
  {
    kicker: "03 — LARGEST GAP",
    text: "Palau: 97.7% of urban population had safe drinking water in 2024, compared to just 57.3% in rural areas — a 40+ point gap, the widest in the region.",
    align: "left",
  },
  {
    kicker: "04 — NARROWEST GAP",
    text: "Tuvalu has just a 5-point gap — but since both urban and rural hover around 10%, this is 'equality' in deprivation, not in sufficiency.",
    align: "right",
  },
  {
    kicker: "05 — TRAJECTORY 2016 → 2024",
    text: "From 2016 to 2024, the gap barely narrowed. In Palau and Samoa it even widened, because urban areas improved much faster than rural areas.",
    align: "left",
  },
];

export default function Part2Chart2V2() {
  const palette = useMemo(() => makePalette(SCATTER_COUNTRIES), []);
  const [currentStep, setCurrentStep] = useState(0);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const graphicRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(520);

  useEffect(() => {
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const vh = window.innerHeight;
        const maxSize = vh < 700 ? 420 : 500;
        const s = Math.max(
          Math.min(e.contentRect.width, e.contentRect.height, maxSize),
          280
        );
        setSize(s);
      }
    });
    if (graphicRef.current) ro.observe(graphicRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (visible) {
          const idx = Number((visible.target as HTMLElement).dataset.stepIndex);
          if (!Number.isNaN(idx)) setCurrentStep(idx);
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    stepRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const margin = { top: 26, right: 22, bottom: 52, left: 52 };
  const innerW = size - margin.left - margin.right;
  const innerH = size - margin.top - margin.bottom;

  const scale = (v: number) => (v / 100) * innerW;

  const getVal = (name: string, kind: "urban" | "rural", year: number) =>
    cleanWaterData[name][kind].find((s) => s.year === year)?.value ?? 0;

  const showDiagonalShade = currentStep >= 1;
  const highlightCountry =
    currentStep === 2 ? "Palau" : currentStep === 3 ? "Tuvalu" : null;
  const showTrajectory = currentStep >= 4;

  const fillFor = (name: string) =>
    currentStep === 0 ? NEUTRAL_LINE : (palette.get(name) as string);

  const radiusFor = (name: string) => {
    if (highlightCountry) return name === highlightCountry ? 12 : 5;
    return 7.5;
  };

  const opacityFor = (name: string) => {
    if (highlightCountry) return name === highlightCountry ? 1 : 0.12;
    return currentStep === 0 ? 0.55 : 0.9;
  };

  const ticks = [0, 25, 50, 75, 100];

  return (
    <section id="part1-chart1" className="relative bg-foam px-6 py-14 md:px-16">
      <div className="mx-auto max-w-6xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-tide mb-3">
          Part 2 &middot; Chart 2
        </p>
        <h1 className="font-display text-3xl sm:text-4xl text-ink max-w-3xl">
          Safe drinking water: Rural &mdash; Urban divide
        </h1>
        <p className="mt-3 max-w-2xl text-sm sm:text-base text-ink-dim leading-relaxed">
          Scatter plot comparing access to safely managed drinking water (SDG 6.1.1)
          between rural and urban areas, for 7 countries with full disaggregated
          data. Scroll to explore each story layer — the chart stays pinned while
          you read.
        </p>
        <div className="mt-12 flex items-center gap-2 font-mono text-[11px] text-ink-faint animate-pulse">
          <svg width="12" height="16" viewBox="0 0 12 16" fill="none">
            <path
              d="M6 1v12M1 9l5 5 5-5"
              stroke="black"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Scroll to begin
        </div>
      </div>

      {/* SCROLLYTELLING SECTION */}
      <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
        {/* Sticky chart */}
        <div
          ref={graphicRef}
          className="sticky top-16 h-[calc(100vh-4rem)] flex items-center justify-center z-0"
        >
          <div className="chart-paper rounded-lg p-3 sm:p-5 w-full max-w-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-faint">
                Safe drinking water &middot; {showTrajectory ? `${YEAR_EARLY} → ${YEAR_LATE}` : YEAR_LATE}
              </span>
              <span className="font-mono text-[10px] text-ink-faint">
                {currentStep + 1} / {steps.length}
              </span>
            </div>
            <svg
              width="100%"
              viewBox={`0 0 ${size} ${size}`}
              className="mx-auto block"
            >
              <g transform={`translate(${margin.left},${margin.top})`}>
                {/* upper-triangle diagonal shading */}
                <polygon
                  points={`0,${innerH} 0,0 ${innerW},0`}
                  fill="var(--tide)"
                  opacity={showDiagonalShade ? 0.03 : 0}
                  style={{ transition: "opacity 500ms ease" }}
                />
                {/* gridlines */}
                {ticks.map((t) => (
                  <g key={t}>
                    <line
                      x1={0}
                      x2={innerW}
                      y1={innerH - scale(t)}
                      y2={innerH - scale(t)}
                      stroke="var(--grid)"
                      strokeWidth={0.6}
                    />
                    <line
                      x1={scale(t)}
                      x2={scale(t)}
                      y1={0}
                      y2={innerH}
                      stroke="var(--grid)"
                      strokeWidth={0.6}
                    />
                    <text
                      x={scale(t)}
                      y={innerH + 16}
                      textAnchor="middle"
                      fontSize={9}
                      fontFamily="var(--font-mono)"
                      fill="var(--ink-faint)"
                    >
                      {t}
                    </text>
                    <text
                      x={-8}
                      y={innerH - scale(t) + 3}
                      textAnchor="end"
                      fontSize={9}
                      fontFamily="var(--font-mono)"
                      fill="var(--ink-faint)"
                    >
                      {t}
                    </text>
                  </g>
                ))}

                {/* diagonal equality line */}
                <line
                  x1={0}
                  y1={innerH}
                  x2={innerW}
                  y2={0}
                  stroke="var(--brass)"
                  strokeDasharray="3,4"
                  opacity={0.6}
                />
                {showDiagonalShade && (
                  <text
                    x={innerW - 8}
                    y={16}
                    textAnchor="end"
                    fontSize={9.5}
                    fontFamily="var(--font-mono)"
                    fill="var(--brass-bright)"
                    style={{ transition: "opacity 500ms ease" }}
                  >
                    urban always higher ↑
                  </text>
                )}

                {/* trajectory lines (2016 -> 2024) */}
                {SCATTER_COUNTRIES.map((name) => {
                  const rx0 = scale(getVal(name, "rural", YEAR_EARLY));
                  const ry0 = innerH - scale(getVal(name, "urban", YEAR_EARLY));
                  const rx1 = scale(getVal(name, "rural", YEAR_LATE));
                  const ry1 = innerH - scale(getVal(name, "urban", YEAR_LATE));
                  return (
                    <line
                      key={`traj-${name}`}
                      x1={rx0}
                      y1={ry0}
                      x2={rx1}
                      y2={ry1}
                      stroke="var(--brass-bright)"
                      strokeWidth={1.2}
                      opacity={showTrajectory ? 0.5 : 0}
                      style={{ transition: "opacity 500ms ease" }}
                    />
                  );
                })}

                {/* faded 2016 markers */}
                {SCATTER_COUNTRIES.map((name) => {
                  const rx = scale(getVal(name, "rural", YEAR_EARLY));
                  const ry = innerH - scale(getVal(name, "urban", YEAR_EARLY));
                  return (
                    <circle
                      key={`early-${name}`}
                      cx={rx}
                      cy={ry}
                      r={4}
                      fill="none"
                      stroke={palette.get(name)}
                      strokeWidth={1.5}
                      opacity={showTrajectory ? 0.5 : 0}
                      style={{ transition: "opacity 500ms ease" }}
                    />
                  );
                })}

                {/* main markers (2024) */}
                {SCATTER_COUNTRIES.map((name) => {
                  const rx = scale(getVal(name, "rural", YEAR_LATE));
                  const ry = innerH - scale(getVal(name, "urban", YEAR_LATE));
                  const isHighlight = highlightCountry === name;
                  return (
                    <g
                      key={name}
                      transform={`translate(${rx},${ry})`}
                      style={{ transition: "transform 600ms cubic-bezier(.4,0,.2,1)" }}
                    >
                      <circle
                        r={radiusFor(name)}
                        fill={fillFor(name)}
                        opacity={opacityFor(name)}
                        stroke="var(--paper-raised)"
                        strokeWidth={1.5}
                        style={{
                          transition:
                            "r 400ms ease, opacity 400ms ease, fill 400ms ease",
                        }}
                      />
                      <text
                        x={0}
                        y={-radiusFor(name) - 6}
                        textAnchor="middle"
                        fontSize={isHighlight ? 11 : 9}
                        fontFamily="var(--font-mono)"
                        fill={isHighlight ? "var(--brass-bright)" : "var(--ink-dim)"}
                        opacity={
                          highlightCountry ? (isHighlight ? 1 : 0) : currentStep === 0 ? 0 : 0.85
                        }
                        style={{ transition: "opacity 400ms ease, font-size 400ms ease" }}
                      >
                        {shortName(name)}
                      </text>
                      {isHighlight && (
                        <text
                          x={0}
                          y={radiusFor(name) + 16}
                          textAnchor="middle"
                          fontSize={10}
                          fontFamily="var(--font-mono)"
                          fill="var(--ink)"
                        >
                          {`R ${getVal(name, "rural", YEAR_LATE).toFixed(0)}% · U ${getVal(
                            name,
                            "urban",
                            YEAR_LATE
                          ).toFixed(0)}%`}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* axis labels */}
                <text
                  x={innerW / 2}
                  y={innerH + 40}
                  textAnchor="middle"
                  fontSize={10.5}
                  fontFamily="var(--font-mono)"
                  fill="var(--ink-dim)"
                >
                  RURAL (%)
                </text>
                <text
                  transform={`translate(${-42},${innerH / 2}) rotate(-90)`}
                  textAnchor="middle"
                  fontSize={10.5}
                  fontFamily="var(--font-mono)"
                  fill="var(--ink-dim)"
                >
                  URBAN (%)
                </text>
              </g>
            </svg>

            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2 pt-3 border-t border-grid">
              {SCATTER_COUNTRIES.map((name) => (
                <span key={name} className="flex items-center gap-1">
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ background: palette.get(name) }}
                  />
                  <Flag iso2={cleanWaterData[name].iso2} className="w-3.5 h-2.5" />
                  <span className="font-mono text-[9px] text-ink-faint">
                    {shortName(name)}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll steps */}
        {steps.map((step, i) => (
          <div
            key={i}
            ref={(el) => {
              stepRefs.current[i] = el;
            }}
            data-step-index={i}
            className={`min-h-[calc(100vh-4rem)] flex items-center relative z-20 pointer-events-none px-1 sm:px-4 ${
              i === 0 ? "-mt-[calc(100vh-4rem)]" : ""
            } ${step.align === "left" ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`chart-paper rounded-lg p-5 sm:p-6 max-w-sm shadow-2xl pointer-events-auto transition-all duration-300 ${
                currentStep === i
                  ? "border-brass-bright scale-[1.03] opacity-100 bg-white"
                  : "opacity-60"
              }`}
            >
              <span className="font-mono text-[10px] tracking-[0.15em] text-brass-bright">
                {step.kicker}
              </span>
              <p className="mt-2 text-sm sm:text-[15px] text-ink leading-relaxed">
                {step.text}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-12 sm:py-16">
        <p className="font-mono text-[11px] text-ink-faint leading-relaxed max-w-2xl">
          Note: Nauru has urban-only data, Wallis &amp; Futuna has rural-only
          data, so neither qualifies for this scatter plot. Remaining
          countries/territories have no disaggregated reporting for SDG 6.1.1
          in the source dataset.
        </p>
      </div>
    </section>
  );
}