"use client";

import { useMemo, useState, useRef } from "react";
import * as d3 from "d3";
import { cleanWaterFull, indicatorIds, shortName } from "@/lib/data";
import { useDimensions } from "@/hooks/useDimensions";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { makePalette } from "@/lib/colors";

type DataPoint = {
  country: string;
  indicatorId: string;
  indicatorLabel: string;
  year: number;
  value: number;
};

const ENGLISH_LABELS: Record<string, string> = {
  "SH_H2O_SAFE": "Safely managed drinking water",
  "SH_SAN_HNDWSH": "Basic handwashing facilities",
  "SH_SAN_DEFECT": "Open defecation",
  "SH_SAN_SAFE": "Safely managed sanitation"
};

export default function DotPlotChartOld() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const { width } = useDimensions(wrapRef);
  
  const [hoveredData, setHoveredData] = useState<DataPoint | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

  const countries = useMemo(() => Object.keys(cleanWaterFull[indicatorIds[0]].countries).sort(), []);
  const palette = useMemo(() => makePalette(countries), [countries]);

  const data = useMemo(() => {
    const pts: DataPoint[] = [];
    countries.forEach(country => {
      indicatorIds.forEach(indId => {
        const indData = cleanWaterFull[indId as keyof typeof cleanWaterFull];
        const countryData = indData.countries[country];
        if (countryData && countryData.total) {
          countryData.total.forEach(d => {
            pts.push({
              country,
              indicatorId: indId,
              indicatorLabel: ENGLISH_LABELS[indId] || indData.label,
              year: d.year,
              value: d.value,
            });
          });
        }
      });
    });
    return pts;
  }, [countries]);

  const rowHeight = 120;
  const groupSpacing = 40;
  
  const totalRows = countries.length * indicatorIds.length;
  const innerH = totalRows * rowHeight + (countries.length - 1) * groupSpacing;
  
  const margin = { top: 80, right: 60, bottom: 40, left: 300 };
  const height = innerH + margin.top + margin.bottom;
  const innerW = width > 0 ? width - margin.left - margin.right : 0;

  const xScale = useMemo(
    () => d3.scaleLinear().domain([0, 100]).range([0, innerW]),
    [innerW]
  );

  const yPositions = useMemo(() => {
    const pos = new Map<string, number>();
    let currentY = rowHeight / 2;
    
    countries.forEach((country, cIdx) => {
      indicatorIds.forEach((indId, iIdx) => {
        pos.set(`${country}-${indId}`, currentY);
        currentY += rowHeight;
      });
      if (cIdx < countries.length - 1) {
        currentY += groupSpacing;
      }
    });
    return pos;
  }, [countries]);

  const averages = useMemo(() => {
    const avgs = new Map<string, number>();
    countries.forEach(country => {
      indicatorIds.forEach(indId => {
        const rowData = data.filter(d => d.country === country && d.indicatorId === indId);
        if (rowData.length > 0) {
          const mean = d3.mean(rowData, d => d.value) || 0;
          avgs.set(`${country}-${indId}`, mean);
        }
      });
    });
    return avgs;
  }, [countries, data]);

  const years = useMemo(() => Array.from(new Set(data.map(d => d.year))).sort(), [data]);

  const handleMouseMove = (e: React.MouseEvent<SVGElement>) => {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - margin.left;
    const y = e.clientY - rect.top - margin.top;
    
    let closestPt: DataPoint | null = null;
    let minD = 30;
    
    data.forEach(d => {
      const cx = xScale(d.value);
      const yearIdx = years.indexOf(d.year);
      const cyOffset = (yearIdx - (years.length - 1) / 2) * 12;
      const cy = (yPositions.get(`${d.country}-${d.indicatorId}`) || 0) + cyOffset;
      const dist = Math.sqrt((cx - x) ** 2 + (cy - y) ** 2);
      if (dist < minD) {
        minD = dist;
        closestPt = d;
      }
    });
    
    if (closestPt) {
      setHoveredData(closestPt);
      const yearIdx = years.indexOf((closestPt as DataPoint).year);
      const cyOffset = (yearIdx - (years.length - 1) / 2) * 12;
      setHoverPos({
        x: xScale((closestPt as DataPoint).value) + margin.left,
        y: (yPositions.get(`${(closestPt as DataPoint).country}-${(closestPt as DataPoint).indicatorId}`) || 0) + cyOffset + margin.top
      });
    } else {
      setHoveredData(null);
    }
  };

  return (
    <section className="relative mt-20 pt-10">
      <div className="mx-auto max-w-6xl">
        <ScrollReveal animation="fade-down" delay={200}>
          <h2 className="font-display text-2xl sm:text-3xl text-ink max-w-3xl">
            Comparison version (X-axis is %)
          </h2>
        </ScrollReveal>
        <ScrollReveal animation="fade-up" delay={400}>
          <p className="mt-3 max-w-3xl text-sm sm:text-base text-ink/65 leading-relaxed">
            Distribution of the clean water and sanitation indicators. Here, the X-axis is the percentage value and the dots are staggered vertically by year.
          </p>
        </ScrollReveal>

        <div className="mt-10 relative">
          <div className="w-full overflow-x-auto overflow-y-hidden custom-scroll" ref={wrapRef}>
            {width > 0 && (
              <svg width={Math.max(width, 800)} height={height} className="block overflow-visible font-sans" onMouseMove={handleMouseMove} onMouseLeave={() => setHoveredData(null)}>
                <g transform={`translate(${margin.left},${margin.top})`}>
                  
                  {xScale.ticks(10).map(tick => (
                    <g key={`x-${tick}`} transform={`translate(${xScale(tick)},0)`}>
                      <line y1={0} y2={innerH} stroke="#e5e7eb" strokeWidth={1} />
                      <text y={-10} textAnchor="middle" fill="#6b7280" fontSize={11} fontWeight="500">
                        {tick}%
                      </text>
                      <text y={innerH + 25} textAnchor="middle" fill="#6b7280" fontSize={11} fontWeight="500">
                        {tick}%
                      </text>
                    </g>
                  ))}

                  <text x={-margin.left + 20} y={-50} fill="#4b5563" fontSize={11} fontWeight="500">Countries</text>
                  <text x={-margin.left + 120} y={-50} fill="#4b5563" fontSize={11} fontWeight="500">Indicators</text>
                  <line x1={-margin.left + 20} x2={innerW} y1={-35} y2={-35} stroke="#d1d5db" strokeWidth={1} />

                  {countries.map((country, cIdx) => {
                    const countryStartY = yPositions.get(`${country}-${indicatorIds[0]}`) || 0;
                    return (
                      <g key={country}>
                        <text x={-margin.left + 20} y={countryStartY + (indicatorIds.length * rowHeight / 2) - (rowHeight / 2)} fill="#374151" fontSize={12} fontWeight="600" dominantBaseline="middle">
                          {shortName(country)}
                        </text>
                        
                        {indicatorIds.map((indId, iIdx) => {
                          const y = yPositions.get(`${country}-${indId}`) || 0;
                          const avg = averages.get(`${country}-${indId}`);
                          const label = ENGLISH_LABELS[indId] || indId;

                          return (
                            <g key={indId} transform={`translate(0, ${y})`}>
                              <text x={-margin.left + 120} y={0} fill="#4b5563" fontSize={11} dominantBaseline="middle">
                                {label}
                              </text>
                              
                              <line x1={-margin.left + 120} x2={innerW} y1={0} y2={0} stroke="#e5e7eb" strokeWidth={1} strokeOpacity={0.6} />
                              
                              {avg !== undefined && (
                                <g transform={`translate(${xScale(avg)}, 0)`}>
                                  <line 
                                    x1={0} x2={0} 
                                    y1={-20} y2={20} 
                                    stroke="#9ca3af" 
                                    strokeWidth={2}
                                  />
                                  <text x={4} y={15} fill="#6b7280" fontSize={9} fontWeight="500">
                                    {avg.toFixed(1)}
                                  </text>
                                </g>
                              )}
                            </g>
                          );
                        })}
                        
                        {cIdx < countries.length - 1 && (
                          <line 
                            x1={-margin.left + 20} 
                            x2={innerW} 
                            y1={countryStartY + (indicatorIds.length * rowHeight) - rowHeight/2 + groupSpacing/2} 
                            y2={countryStartY + (indicatorIds.length * rowHeight) - rowHeight/2 + groupSpacing/2} 
                            stroke="#d1d5db" 
                            strokeWidth={1} 
                          />
                        )}
                      </g>
                    );
                  })}

                  {data.map((d, i) => {
                    const cx = xScale(d.value);
                    const baseCy = yPositions.get(`${d.country}-${d.indicatorId}`) || 0;
                    const color = palette.get(d.country) || "var(--coral)";
                    
                    const yearIdx = years.indexOf(d.year);
                    const isLatest = d.year === years[years.length - 1];
                    const cyOffset = (yearIdx - (years.length - 1) / 2) * 12;
                    
                    const cy = baseCy + cyOffset;
                    const r = 5 + (yearIdx / years.length) * 7;
                    const opacity = 0.4 + (yearIdx / years.length) * 0.6;
                    const isHovered = hoveredData?.country === d.country && hoveredData?.indicatorId === d.indicatorId && hoveredData?.year === d.year;

                    return (
                      <circle 
                        key={i} 
                        cx={cx} 
                        cy={cy} 
                        r={isHovered ? r + 3 : r} 
                        fill={color} 
                        fillOpacity={opacity}
                        stroke={isLatest ? "#ffffff" : "none"}
                        strokeWidth={1.5}
                        style={{ transition: 'all 0.2s ease', pointerEvents: 'none' }}
                      />
                    );
                  })}
                </g>
              </svg>
            )}
            
            {hoveredData && (
              <div 
                className="absolute z-10 pointer-events-none bg-white border border-gray-200 shadow-md rounded px-3 py-2 text-xs"
                style={{
                  left: hoverPos.x,
                  top: hoverPos.y - 10,
                  transform: 'translate(-50%, -100%)'
                }}
              >
                <div className="font-bold text-ink mb-1">{shortName(hoveredData.country)} ({hoveredData.year})</div>
                <div className="text-ink-dim max-w-[200px] truncate mb-1">{hoveredData.indicatorLabel}</div>
                <div className=" font-medium">{hoveredData.value.toFixed(1)}%</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
