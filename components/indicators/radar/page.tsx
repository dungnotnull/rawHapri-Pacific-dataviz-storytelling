"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import {
  cleanWaterFull,
  radarCountries,
  radarCountryIso2,
  shortName,
  ALL_INDICATOR_YEARS,
} from "@/lib/data";
import { makePalette } from "@/lib/colors";
import Flag from "@/components/ui/Flag";
import YearScrubber from "@/components/ui/YearScrubber";


const AXES = [
  { id: "SH_H2O_SAFE", short: "Safe drinking\nwater", invert: false },
  { id: "SH_SAN_HNDWSH", short: "Basic hand\nwashing", invert: false },
  { id: "SH_SAN_SAFE", short: "Safe\nsanitation", invert: false },
  { id: "SH_SAN_DEFECT", short: "No open\ndefecation", invert: true },
];

const DEFAULT_COUNTRIES = radarCountries.slice(0, 2);

export default function RadarPage() {
  const palette = useMemo(() => makePalette(radarCountries), []);
  const [selected, setSelected] = useState<string[]>(DEFAULT_COUNTRIES);
  const [year, setYear] = useState(ALL_INDICATOR_YEARS[ALL_INDICATOR_YEARS.length - 1]);
  const size = 560;
  const R = 200;
  const cx = size / 2;
  const cy = size / 2 + 8;

  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / AXES.length;

  const valueAt = (name: string, axisIdx: number, yr: number): number | null => {
    const axis = AXES[axisIdx];
    const c = cleanWaterFull[axis.id].countries[name];
    const pt = c?.total.find((p) => p.year === yr);
    if (!pt) return null;
    return axis.invert ? 100 - pt.value : pt.value;
  };

  const pointsFor = (name: string, yr: number) =>
    AXES.map((_, i) => {
      const v = valueAt(name, i, yr) ?? 0;
      const r = (Math.max(v, 0) / 100) * R;
      return { x: cx + r * Math.cos(angle(i)), y: cy + r * Math.sin(angle(i)) };
    });

  const lineGen = d3
    .line<{ x: number; y: number }>()
    .x((d) => d.x)
    .y((d) => d.y)
    .curve(d3.curveLinearClosed);

  const pathRefs = useRef<Record<string, SVGPathElement | null>>({});
  const prevPoints = useRef<Record<string, { x: number; y: number }[]>>({});

  useEffect(() => {
    selected.forEach((name) => {
      const el = pathRefs.current[name];
      const to = pointsFor(name, year);
      if (!el) {
        prevPoints.current[name] = to;
        return;
      }
      const from = prevPoints.current[name] ?? to;
      const interpolators = to.map((p, i) => d3.interpolate(from[i] ?? p, p));
      d3.select(el)
        .transition()
        .duration(600)
        .ease(d3.easeCubicInOut)
        .attrTween("d", () => (t: number) => {
          const pts = interpolators.map((fn) => fn(t));
          return lineGen(pts) ?? "";
        });
      prevPoints.current[name] = to;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, selected.join(",")]);

  const toggle = (name: string) => {
    setSelected((prev) => {
      if (prev.includes(name)) return prev.filter((n) => n !== name);
      if (prev.length >= 4) return prev;
      return [...prev, name];
    });
  };

  const rings = [25, 50, 75, 100];

  return (
    <div id="radar-section">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-6 sm:py-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-tide mb-3">
          Analysis Station &middot; Radar Chart
        </p>
        <h2 className="font-display text-2xl sm:text-3xl text-ink max-w-3xl">
          WASH profiles by country, across years
        </h2>
        <p className="mt-3 max-w-2xl text-sm sm:text-base text-ink-dim leading-relaxed">
          Four axes represent four SDG 6 indicators (safe drinking water, basic hand
          washing, safe sanitation, and <em>not</em> practicing open defecation — this
          axis is inverted so "outward is better" for consistency). Only 6 countries
          have complete data across all four indicators for fair comparison. Select
          up to 4 countries to overlay.
        </p>

        <div className="mt-8 grid lg:grid-cols-[1fr_340px] gap-6">
          <div className="chart-paper rounded-lg p-4 sm:p-6 flex items-center justify-center">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              {/* grid rings */}
              {rings.map((ring) => (
                <polygon
                  key={ring}
                  points={AXES.map((_, i) => {
                    const r = (ring / 100) * R;
                    return `${cx + r * Math.cos(angle(i))},${cy + r * Math.sin(angle(i))}`;
                  }).join(" ")}
                  fill="none"
                  stroke="var(--grid)"
                  strokeWidth={1.2}
                />
              ))}
              {/* axis lines + labels */}
              {AXES.map((axis, i) => {
                const x = cx + R * Math.cos(angle(i));
                const y = cy + R * Math.sin(angle(i));
                const lx = cx + (R + 42) * Math.cos(angle(i));
                const ly = cy + (R + 42) * Math.sin(angle(i));
                return (
                  <g key={axis.id}>
                    <line x1={cx} y1={cy} x2={x} y2={y} stroke="var(--grid)" strokeWidth={1.2} />
                    <text
                      x={lx}
                      y={ly}
                      textAnchor="middle"
                      fontSize={12}
                      fontFamily="var(--font-mono)"
                      fill="var(--ink-dim)"
                      fontWeight={500}
                    >
                      {axis.short.split("\n").map((line, li) => (
                        <tspan key={li} x={lx} dy={li === 0 ? 0 : 14}>
                          {line}
                        </tspan>
                      ))}
                    </text>
                  </g>
                );
              })}
              {/* ring value labels */}
              {rings.map((ring) => (
                <text
                  key={`lbl-${ring}`}
                  x={cx + 5}
                  y={cy - (ring / 100) * R}
                  fontSize={11}
                  fontFamily="var(--font-mono)"
                  fill="var(--ink-dim)"
                  fontWeight={500}
                >
                  {ring}
                </text>
              ))}

              {/* country polygons */}
              {selected.map((name) => (
                <g key={name}>
                  <path
                    ref={(el) => {
                      pathRefs.current[name] = el;
                    }}
                    d={lineGen(pointsFor(name, year)) ?? ""}
                    fill={palette.get(name)}
                    fillOpacity={0.16}
                    stroke={palette.get(name)}
                    strokeWidth={2.8}
                  />
                </g>
              ))}
              {/* vertex dots on top, following current data directly (snap, path handles the tween) */}
              {selected.map((name) =>
                pointsFor(name, year).map((p, i) => (
                  <circle
                    key={`${name}-${i}`}
                    cx={p.x}
                    cy={p.y}
                    r={4.2}
                    fill={palette.get(name)}
                    stroke="var(--paper-raised)"
                    strokeWidth={1.3}
                    style={{ transition: "cx 600ms ease, cy 600ms ease" }}
                  />
                ))
              )}
            </svg>
          </div>

          <div className="flex flex-col gap-4">
            <YearScrubber years={ALL_INDICATOR_YEARS} year={year} onChange={setYear} speedMs={1000} variant="vertical" />

            <div className="grid grid-cols-2 gap-3">
              <div className="chart-paper rounded-lg p-4">
                <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-faint block mb-3">
                  Countries (max 4)
                </span>
                <div className="flex flex-col gap-1">
                  {radarCountries.map((name) => {
                    const isActive = selected.includes(name);
                    return (
                      <button
                        key={name}
                        onClick={() => toggle(name)}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded text-left transition-all cursor-pointer ${
                          isActive ? "bg-paper-raised-2 shadow-sm hover:shadow-md" : "opacity-55 hover:opacity-85 hover:bg-paper hover:shadow-sm"
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: isActive ? palette.get(name) : "var(--ink-faint)" }}
                        />
                        <Flag iso2={radarCountryIso2(name)} className="w-4 h-3 shrink-0" />
                        <span className="font-mono text-[10px] text-ink font-medium truncate">
                          {shortName(name)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="chart-paper rounded-lg p-4">
                <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink-faint block mb-3">
                  Year {year} values
                </span>
                <div className="flex flex-col gap-2">
                  {selected.map((name) => (
                    <div key={name} className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: palette.get(name) }}
                      />
                      <span className="font-mono text-[10px] text-ink truncate flex-1 font-medium">
                        {shortName(name)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
