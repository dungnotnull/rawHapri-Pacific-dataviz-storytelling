"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { cleanWaterFull, TARGET_PICS, shortName } from "@/lib/data";
import { SourceNote } from "@/components/ui/SourceNote";
import Flag from "@/components/ui/Flag";
import * as d3 from "d3";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

// Dynamically import react-plotly factory to avoid heavy plotly.js and SSR issues
const Plot = dynamic(() => 
  import("react-plotly.js/factory").then((mod) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Plotly = require("plotly.js-dist-min");
    return mod.default(Plotly);
  }), 
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-ink/5 rounded-lg border border-ink/10 min-h-[120px]">
        <div className="flex flex-col items-center gap-2 opacity-50">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-medium text-ink-dim">Processing data...</span>
        </div>
      </div>
    )
  }
);

const INDICATORS = {
  water: "SH_H2O_SAFE",
  defecation: "SH_SAN_DEFECT",
  handwashing: "SH_SAN_HNDWSH",
};

// Colors for countries in the legend/scatter
const COUNTRY_COLORS = [
  "#9333ea", // Niue (purple)
  "#0ea5e9", // Palau (blue)
  "#ef4444", // Samoa (red)
  "#06b6d4", // Fiji (cyan)
  "#8b5cf6", // Tonga (violet)
  "#10b981", // Vanuatu (emerald)
  "#3b82f6", // Marshall Islands (blue)
  "#6366f1", // Micronesia (indigo)
  "#14b8a6", // Solomon Islands (teal)
  "#f43f5e", // Kiribati (rose)
  "#f97316", // Tuvalu (orange)
  "#84cc16", // Cook Islands (lime)
  "#eab308", // Nauru (yellow)
];

export default function WashTriangleDashboard() {
  const [selectedYear, setSelectedYear] = useState<number>(2024);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

  // Lazy loading state
  const [inView, setInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "400px" } 
    );
    if (containerRef.current) observer.observe(containerRef.current);
    
    return () => observer.disconnect();
  }, []);

  // Extract valid years (2016 to 2024)
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    Object.values(INDICATORS).forEach((id) => {
      cleanWaterFull[id]?.years.forEach((y) => {
        if (y >= 2016 && y <= 2024) years.add(y);
      });
    });
    return Array.from(years).sort();
  }, []);

  // Helper to get exact value for the year
  const getExactValue = (countryName: string, indicatorId: string, targetYear: number) => {
    const cData = cleanWaterFull[indicatorId]?.countries[countryName];
    if (!cData || !cData.total || cData.total.length === 0) return null;
    const pt = cData.total.find((d) => d.year === targetYear);
    return pt ? pt.value : null;
  };

  // Compile data for the selected year
  const dataMap = useMemo(() => {
    const map = new Map();
    TARGET_PICS.forEach((country) => {
      const water = getExactValue(country, INDICATORS.water, selectedYear);
      const defecation = getExactValue(country, INDICATORS.defecation, selectedYear);
      const handwashing = getExactValue(country, INDICATORS.handwashing, selectedYear);

      // Only include countries that have all three metrics to keep the 3D space, legend, and 2D charts consistent
      if (water !== null && defecation !== null && handwashing !== null) {
        map.set(country, { water, defecation, handwashing });
      }
    });
    return map;
  }, [selectedYear]);

  const activeCountries = Array.from(dataMap.keys()).sort();

  // Compute Pacific Averages
  const averages = useMemo(() => {
    const vals = { water: [] as number[], defecation: [] as number[], handwashing: [] as number[] };
    activeCountries.forEach((c) => {
      const d = dataMap.get(c);
      if (d.water !== null) vals.water.push(d.water);
      if (d.defecation !== null) vals.defecation.push(d.defecation);
      if (d.handwashing !== null) vals.handwashing.push(d.handwashing);
    });
    return {
      water: d3.mean(vals.water) || 0,
      defecation: d3.mean(vals.defecation) || 0,
      handwashing: d3.mean(vals.handwashing) || 0,
    };
  }, [dataMap, activeCountries]);

  // Compute Extremes
  const extremes = useMemo(() => {
    const getExtreme = (key: "water" | "defecation" | "handwashing", type: "max" | "min") => {
      let extVal = type === "max" ? -Infinity : Infinity;
      let extCountry = "";
      activeCountries.forEach((c) => {
        const val = dataMap.get(c)[key];
        if (val !== null) {
          if (type === "max" && val > extVal) {
            extVal = val;
            extCountry = c;
          }
          if (type === "min" && val < extVal) {
            extVal = val;
            extCountry = c;
          }
        }
      });
      return { country: extCountry, value: extVal === Infinity || extVal === -Infinity ? null : extVal };
    };

    return {
      water: { high: getExtreme("water", "max"), low: getExtreme("water", "min") },
      defecation: { high: getExtreme("defecation", "max"), low: getExtreme("defecation", "min") },
      handwashing: { high: getExtreme("handwashing", "max"), low: getExtreme("handwashing", "min") },
    };
  }, [dataMap, activeCountries]);

  // Compute Composite Scores (Top 3)
  const topCountries = useMemo(() => {
    const scores = activeCountries.map((c) => {
      const d = dataMap.get(c);
      // Normalize (0-1). Water: higher is better. Handwashing: higher is better. Defecation: lower is better.
      const wScore = d.water !== null ? d.water / 100 : 0;
      const hScore = d.handwashing !== null ? d.handwashing / 100 : 0;
      const dScore = d.defecation !== null ? Math.max(0, 1 - d.defecation / 100) : 0;

      // Only score countries with at least 2 metrics
      const validMetrics = [d.water, d.handwashing, d.defecation].filter((v) => v !== null).length;
      if (validMetrics < 2) return { country: c, score: -1 };

      const score = (wScore + hScore + dScore) / 3;
      return { country: c, score };
    });

    return scores.filter((s) => s.score >= 0).sort((a, b) => b.score - a.score).slice(0, 3);
  }, [dataMap, activeCountries]);

  // 3D Chart Data formatting
  const plotData3D = useMemo(() => {
    return activeCountries.map((c, i) => {
      const d = dataMap.get(c);
      const isHovered = hoveredCountry === c;
      const isOtherHovered = hoveredCountry !== null && hoveredCountry !== c;
      
      const size = isHovered ? 14 : 8;
      const opacity = isOtherHovered ? 0.3 : 0.85;
      const color = COUNTRY_COLORS[i % COUNTRY_COLORS.length];

      return {
        type: "scatter3d",
        mode: isOtherHovered ? "markers" : "markers+text",
        name: shortName(c),
        x: [d.water],
        y: [d.defecation],
        z: [d.handwashing],
        text: [shortName(c)],
        textposition: "top center",
        textfont: {
          family: "inherit",
          size: 11
        },
        marker: {
          size: size,
          color: color,
          opacity: opacity,
          line: { width: 0 }
        },
        hoverinfo: "text",
        hovertext: `${shortName(c)}<br>Water: ${d.water?.toFixed(1)}%<br>Defecation: ${d.defecation?.toFixed(1)}%<br>Handwashing: ${d.handwashing?.toFixed(1)}%`,
        showlegend: false,
      };
    });
  }, [dataMap, activeCountries, hoveredCountry]);

  const plotLayout3D = {
    margin: { l: 0, r: 0, b: 0, t: 0 },
    font: { family: "system-ui, -apple-system, sans-serif", color: "var(--ink)" },
    hoverlabel: {
      bgcolor: "rgba(255, 255, 255, 0.95)",
      bordercolor: "rgba(14, 42, 44, 0.1)",
      font: { color: "#0e2a2c", family: "inherit", size: 12 },
    },
    scene: {
      xaxis: { 
        title: { text: "Safely managed drinking water (%)", font: { color: "#2563eb", size: 12 } }, 
        range: [0, 100], backgroundcolor: "transparent", showbackground: false, ticksuffix: "%",
        color: "#2563eb", gridcolor: "rgba(0,0,0,0.05)", showgrid: true, showline: true, linewidth: 1, linecolor: "#2563eb", zeroline: false
      },
      yaxis: { 
        title: { text: "Open defecation (%)", font: { color: "#ea580c", size: 12 } }, 
        range: [0, 50], backgroundcolor: "transparent", showbackground: false, ticksuffix: "%",
        color: "#ea580c", gridcolor: "rgba(0,0,0,0.05)", showgrid: true, showline: true, linewidth: 1, linecolor: "#ea580c", zeroline: false
      },
      zaxis: { 
        title: { text: "Handwashing facilities (%)", font: { color: "#059669", size: 12 } }, 
        range: [0, 100], backgroundcolor: "transparent", showbackground: false, ticksuffix: "%",
        color: "#059669", gridcolor: "rgba(0,0,0,0.05)", showgrid: true, showline: true, linewidth: 1, linecolor: "#059669", zeroline: false
      },
      camera: {
        eye: { x: 1.85, y: 1.85, z: 1.0 }, // Zoom in slightly
      },
    },
    paper_bgcolor: "transparent",
    hovermode: "closest",
  };

  // 2D Scatter plot generator
  const renderPairwiseScatter = (xKey: "water" | "handwashing", yKey: "defecation" | "handwashing", title: string, xLabel: string, yLabel: string, color: string) => {
    const pts = activeCountries
      .map((c) => ({ x: dataMap.get(c)[xKey], y: dataMap.get(c)[yKey], name: c }))
      .filter((p) => p.x !== null && p.y !== null);

    // Simple linear regression
    const n = pts.length;
    if (n < 2) return null;
    const sumX = d3.sum(pts, (d) => d.x);
    const sumY = d3.sum(pts, (d) => d.y);
    const sumXY = d3.sum(pts, (d) => d.x * d.y);
    const sumX2 = d3.sum(pts, (d) => d.x * d.x);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Correlation coefficient (r)
    const sumY2 = d3.sum(pts, (d) => d.y * d.y);
    const r = (n * sumXY - sumX * sumY) / Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    const xMin = d3.min(pts, (d) => d.x) || 0;
    const xMax = d3.max(pts, (d) => d.x) || 100;
    const lineX = [xMin, xMax];
    const lineY = [slope * xMin + intercept, slope * xMax + intercept];

    return (
      <div className="flex flex-col justify-between flex-1 bg-white/60 backdrop-blur-md rounded-lg p-3 border border-ink/10 shadow-sm overflow-hidden group min-w-[200px]">
        <div className="flex justify-between items-start gap-2 mb-1">
          <h4 className="text-sm font-semibold text-ink/80 leading-tight">{title}</h4>
          <p className="text-xs text-ink/60 font-mono whitespace-nowrap pt-0.5">r = {r.toFixed(2)}</p>
        </div>
        <div className="h-40 w-full relative ">
          {/* @ts-ignore */}
          {inView && (
            <Plot
              data={[
                {
                  x: pts.map((d) => d.x),
                  y: pts.map((d) => d.y),
                  type: "scatter",
                  mode: "markers",
                  marker: { color, size: 6, opacity: 0.7 },
                  text: pts.map((d) => shortName(d.name)),
                  hoverinfo: "text",
                },
                {
                  x: lineX,
                  y: lineY,
                  type: "scatter",
                  mode: "lines",
                  line: { color: "var(--ink-dim)", width: 1, dash: "dot" },
                  hoverinfo: "none",
                },
              ] as any}
              layout={{
                margin: { l: 40, r: 15, b: 40, t: 15 },
                font: { family: "inherit", color: "var(--ink)" },
                xaxis: { title: { text: xLabel, font: { size: 10 } }, tickfont: { size: 9 }, range: [0, 100], ticksuffix: "%" },
                yaxis: { title: { text: yLabel, font: { size: 10 } }, tickfont: { size: 9 }, ticksuffix: "%" },
                showlegend: false,
                paper_bgcolor: "transparent",
                plot_bgcolor: "transparent",
                hoverlabel: {
                  bgcolor: "rgba(255, 255, 255, 0.95)",
                  bordercolor: "rgba(14, 42, 44, 0.1)",
                  font: { color: "#0e2a2c", family: "inherit", size: 11 }
                }
              }}
              config={{ displayModeBar: false }}
              style={{ width: "100%", height: "100%" }}
              useResizeHandler={true}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <section className="relative mb-20 font-sans" ref={containerRef}>
      <div className="mx-auto max-w-6xl px-0">
        {/* Header */}
        <div className="flex flex-col mb-8 relative">
          <h2 className="font-display text-2xl sm:text-3xl text-ink max-w-3xl">
            The Climate Triangle <span className="text-ink/50">— {selectedYear}</span>
          </h2>
         
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-transparent rounded-lg p-5 border-l-2 border-blue-400">
            <div>
              <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider">Safely Managed Drinking Water</h3>
              <p className="text-xs text-ink/60 mt-1">Pacific average</p>
              <p className="text-3xl font-display text-blue-600 mt-1">{averages.water.toFixed(1)}%</p>
            </div>
          </div>
          <div className="bg-transparent rounded-lg p-5 border-l-2 border-orange-400">
            <div>
              <h3 className="text-xs font-bold text-orange-600 uppercase tracking-wider">Open Defecation (lower is better)</h3>
              <p className="text-xs text-ink/60 mt-1">Pacific average</p>
              <p className="text-3xl font-display text-orange-600 mt-1">{averages.defecation.toFixed(1)}%</p>
            </div>
          </div>
          <div className="bg-transparent rounded-lg p-5 border-l-2 border-emerald-400">
            <div>
              <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Handwashing Facilities</h3>
              <p className="text-xs text-ink/60 mt-1">Pacific average</p>
              <p className="text-3xl font-display text-emerald-600 mt-1">{averages.handwashing.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        {/* Main 3D Space & Legend */}
        <div className="flex flex-col lg:flex-row gap-8 mb-12">
          <div className="flex-1 lg:flex-[3] relative" style={{ minHeight: "550px" }}>
            {/* <h3 className="font-semibold text-ink text-sm mb-1">3D WASH SPACE</h3> */}
            <p className="text-xs text-ink/60 mb-4">Drag to rotate • Scroll to zoom</p>

            {/* Year Filter moved inside chart */}
            <div className="absolute top-0 right-0 z-20 flex items-center gap-2 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-ink/10 shadow-sm">
              <span className="text-[10px] font-semibold text-ink/50 uppercase tracking-wider">Year</span>
              <select
                className="bg-transparent text-sm font-bold text-ink outline-none cursor-pointer"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {hoveredCountry && dataMap.get(hoveredCountry) && (
              <div className="absolute top-12 left-4 bg-white/90 backdrop-blur p-4 rounded-lg shadow-lg border border-ink/10 z-10 max-w-[200px] pointer-events-none">
                <h4 className="font-bold text-ink mb-2 border-b border-ink/10 pb-2">{hoveredCountry}</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between gap-4"><span className="text-ink/60">Water:</span> <span className="font-semibold text-blue-600">{dataMap.get(hoveredCountry).water?.toFixed(1)}%</span></div>
                  <div className="flex justify-between gap-4"><span className="text-ink/60">Defecation:</span> <span className="font-semibold text-orange-600">{dataMap.get(hoveredCountry).defecation?.toFixed(1)}%</span></div>
                  <div className="flex justify-between gap-4"><span className="text-ink/60">Handwashing:</span> <span className="font-semibold text-emerald-600">{dataMap.get(hoveredCountry).handwashing?.toFixed(1)}%</span></div>
                </div>
              </div>
            )}
            
            <div className="absolute inset-0 top-8">
              {/* @ts-ignore */}
              {inView && (
                <Plot
                  data={plotData3D as any}
                  layout={plotLayout3D as any}
                  config={{ displayModeBar: false }}
                  style={{ width: "100%", height: "100%" }}
                  useResizeHandler={true}
                />
              )}
            </div>
            
            <div className="absolute -bottom-8 left-4 right-4 text-xs text-ink-dim p-2 rounded backdrop-blur opacity-[0.5]">
              ⓘ Closer to the top-front-right corner is better (high water, low open defecation, high handwashing)
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="flex-1 flex flex-col gap-6">
            <div className="bg-transparent border-l border-ink/10 pl-6 flex-1">
              {/* <h3 className="font-semibold text-ink text-xs mb-4 uppercase tracking-wider">Legend (Countries)</h3> */}
              <div className="flex flex-col gap-1.5 max-h-[450px] overflow-y-auto custom-scroll pr-2">
                {activeCountries.map((c, i) => (
                  <div
                    key={c}
                    className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${hoveredCountry === c ? "bg-ink/5" : "hover:bg-ink/5"}`}
                    onMouseEnter={() => setHoveredCountry(c)}
                    onMouseLeave={() => setHoveredCountry(null)}
                  >
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COUNTRY_COLORS[i % COUNTRY_COLORS.length] }}></div>
                    <Flag iso2={cleanWaterFull[INDICATORS.water].countries[c]?.iso2 || "un"} className="w-5 h-3.5 shadow-sm" />
                    <span className="text-sm font-medium text-ink">{shortName(c)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="flex flex-col lg:flex-row gap-8 pt-8 border-t border-ink/10">
          {/* Scatter Plots */}
          <div className="flex-1 lg:w-2/3">
            <h3 className="font-semibold text-ink text-sm mb-4 uppercase tracking-wider">Pairwise Relationships</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {renderPairwiseScatter("water", "defecation", "Water vs Defecation", "Safely managed drinking water (%)", "Open defecation (%)", "#3b82f6")}
              {renderPairwiseScatter("water", "handwashing", "Water vs Handwashing", "Safely managed drinking water (%)", "Handwashing (%)", "#10b981")}
              {renderPairwiseScatter("handwashing", "defecation", "Handwashing vs Defecation", "Handwashing (%)", "Open defecation (%)", "#8b5cf6")}
            </div>
          </div>

          {/* Extremes & Top 3 */}
          <div className="w-full lg:w-1/3 flex flex-col gap-8 lg:border-l border-ink/10 lg:pl-6">
            <div>
              <h3 className="font-semibold text-ink text-sm mb-4 uppercase tracking-wider">Pacific Extremes</h3>
              <div className="space-y-5 text-sm">
                <div>
                  <div className="font-semibold text-blue-600 text-xs mb-1">SAFELY MANAGED DRINKING WATER</div>
                  <div className="flex justify-between"><span className="text-ink-dim">Highest</span><span className="font-bold text-blue-600">{extremes.water.high.country} ({extremes.water.high.value?.toFixed(1)}%)</span></div>
                  <div className="flex justify-between"><span className="text-ink-dim">Lowest</span><span className="font-medium">{extremes.water.low.country} ({extremes.water.low.value?.toFixed(1)}%)</span></div>
                </div>
                <div>
                  <div className="font-semibold text-orange-600 text-xs mb-1">OPEN DEFECATION (lower is better)</div>
                  <div className="flex justify-between"><span className="text-ink-dim">Lowest</span><span className="font-medium">{extremes.defecation.low.country} ({extremes.defecation.low.value?.toFixed(1)}%)</span></div>
                  <div className="flex justify-between"><span className="text-ink-dim">Highest</span><span className="font-bold text-orange-600">{extremes.defecation.high.country} ({extremes.defecation.high.value?.toFixed(1)}%)</span></div>
                </div>
                <div>
                  <div className="font-semibold text-emerald-600 text-xs mb-1">HANDWASHING FACILITIES</div>
                  <div className="flex justify-between"><span className="text-ink-dim">Highest</span><span className="font-bold text-emerald-600">{extremes.handwashing.high.country} ({extremes.handwashing.high.value?.toFixed(1)}%)</span></div>
                  <div className="flex justify-between"><span className="text-ink-dim">Lowest</span><span className="font-medium">{extremes.handwashing.low.country} ({extremes.handwashing.low.value?.toFixed(1)}%)</span></div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-ink text-sm mb-2 uppercase tracking-wider">Top 3 Composite</h3>
              <p className="text-xs text-ink/60 mb-4 leading-tight">By overall WASH performance score (normalized)</p>
              <div className="space-y-3">
                {topCountries.map((tc, idx) => (
                  <div key={tc.country} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : 'bg-amber-700'}`}>
                      {idx + 1}
                    </div>
                    <span className="text-sm font-medium text-ink flex-1 truncate">{shortName(tc.country)}</span>
                    <div className="w-24 h-2 bg-ink/5 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${tc.score * 100}%` }}></div>
                    </div>
                    <span className="text-xs font-mono font-bold text-indigo-600">{(tc.score).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
         <div className="mt-10 md:mt-4">
                  <SourceNote>
                    <span>Source: Pacific Data Hub, CLIMATE_CHANGE_SEA_INDICATORS, 2016–2023.</span>
                  </SourceNote>
                </div>
                <ScrollReveal animation="fade-up" delay={600}>
                  <p className="mt-3 max-w-2xl text-xs sm:text-sm text-ink-dim leading-relaxed opacity-[0.7]">
                    Distribution of the clean water and sanitation indicators for a selected country. 
                    The dots represent the percentage value staggered vertically by year. 
                    Colors represent the trend from 2016 to 2024 (Green: Improved, Red: Declined, Black: Unchanged).
                  </p>
                </ScrollReveal>
      </div>
    </section>
  );
}
