"use client";

import { useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import { useDimensions } from "@/hooks/useDimensions";
import { EmitterContext } from "@/types";
import emittersContextRaw from "@/data/emitters_context.json";
import ghgData from "@/data/ghg_per_capita.json";
import { getFlagClass } from "@/lib/flags";
import { getCountryCode, isPacificCountry } from "@/lib/countryMapping";

const ghg = ghgData as any[];

// Combine major emitters and Pacific countries for comparison
const getEmittersData = (year: number) => {
  const majorEmitters = emittersContextRaw.major_emitters.map((e: any) => ({
    label: e.label,
    value: e.value,
    group: e.group
  }));

  const pacificCountries = emittersContextRaw.pacific_countries.map((c: any) => {
    const countryCode = getCountryCode(c.label);
    const countryData = ghg.find((g) => g.code === countryCode);

    let value = c.value; // Default to 2023-2024 value

    // Try to get year-specific data
    if (countryData && countryData.series) {
      const yearData = countryData.series.find((s: any) => s.year === year);
      if (yearData) {
        value = yearData.value;
      }
    }

    return {
      label: c.label,
      value: value,
      group: c.group,
      note: c.note
    };
  });

  return [...majorEmitters, ...pacificCountries] as EmitterContext[];
};

interface EmittersContrastBarProps {
  active: boolean;
  onCountryClick?: (countryName: string, countryCode: string) => void;
  selectedYear?: number;
}

export function EmittersContrastBar({ active, onCountryClick, selectedYear = 2024 }: EmittersContrastBarProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { width, height } = useDimensions(wrapRef);

  // Get data for selected year
  const data = useMemo(() => {
    return getEmittersData(selectedYear).sort((a, b) => a.value - b.value);
  }, [selectedYear]);

  useEffect(() => {
    if (!svgRef.current || width === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 4, right: 46, bottom: 4, left: 190 };
    const w = width - margin.left - margin.right;
    const barH = 24;
    const gap = 10;

    const x = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.value)! * 1.08])
      .range([0, w]);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const rows = g
      .selectAll("g.row")
      .data(data)
      .join("g")
      .attr("class", "row")
      .attr("transform", (_, i) => `translate(0,${i * (barH + gap)})`)
      .style("cursor", (d) => (isPacificCountry(d.label) ? "pointer" : "default"))
      .on("click", (event, d) => {
        if (onCountryClick && isPacificCountry(d.label)) {
          const countryCode = getCountryCode(d.label);
          onCountryClick(d.label, countryCode);
        }
      })
      .on("mouseover", function (event, d) {
        // Highlight the bar
        d3.select(this).select("rect")
          .transition()
          .duration(200)
          .attr("opacity", 0.8)
          .attr("stroke", (d: any) => d.group === "pacific" ? "var(--coral)" : "var(--slate)")
          .attr("stroke-width", 2);
      })
      .on("mouseout", function (event, d) {
        // Reset the bar
        d3.select(this).select("rect")
          .transition()
          .duration(200)
          .attr("opacity", 1)
          .attr("stroke", "none")
          .attr("stroke-width", 0);
      });

    rows
      .append("foreignObject")
      .attr("x", -183)
      .attr("y", 0)
      .attr("width", 180)
      .attr("height", barH)
      .append("xhtml:div")
      .style("display", "flex")
      .style("align-items", "center")
      .style("justify-content", "flex-end")
      .style("font-family", "var(--font-body)")
      .style("font-size", "10.5px")
      .style("color", "rgba(14,42,44,0.8)")
      .html((d) => {
        const countryCode = getCountryCode(d.label);
        const flagClass = getFlagClass(countryCode);
        if (flagClass) {
          return `<span class="${flagClass} mr-1.5" style="font-size: 14px;"></span>${d.label}`;
        }
        return d.label;
      });

    rows
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("height", barH)
      .attr("rx", 3)
      .attr("width", 0)
      .attr("fill", (d) => (d.group === "pacific" ? "var(--coral)" : "var(--slate)"))
      .transition()
      .duration(active ? 900 : 0)
      .delay((_, i) => (active ? i * 60 : 0))
      .attr("width", (d) => x(d.value));

    rows
      .append("text")
      .attr("x", (d) => x(d.value) + 8)
      .attr("y", barH / 2)
      .attr("dy", "0.32em")
      .attr("font-family", "var(--font-data)")
      .attr("font-size", 12)
      .attr("fill", "var(--ink)")
      .attr("opacity", 0.75)
      .text((d) => `${d.value.toFixed(1)}t`);
  }, [width, height, active, selectedYear]);

  const rows = data.length;
  const chartHeight = rows * 34;

  return (
    <div ref={wrapRef} className="w-full">
      <svg ref={svgRef} width={width} height={chartHeight} />
    </div>
  );
}