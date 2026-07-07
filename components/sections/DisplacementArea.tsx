"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { MigrationData, YearValue } from "@/types";
import { useDimensions } from "@/hooks/useDimensions";
import migration from "@/data/migration_placeholder.json";

const series = (migration as MigrationData).yearly_displacement.series as YearValue[];

export function DisplacementArea() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { width, height } = useDimensions(wrapRef);

  useEffect(() => {
    if (!svgRef.current || width === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 10, right: 35, bottom: 22, left: 52 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;

    const x = d3
      .scaleLinear()
      .domain(d3.extent(series, (d) => d.year) as [number, number])
      .range([0, w]);
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(series, (d) => d.value)! * 1.15])
      .range([h, 0]);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const area = d3
      .area<YearValue>()
      .x((d) => x(d.year))
      .y0(h)
      .y1((d) => y(d.value))
      .curve(d3.curveMonotoneX);

    const line = d3
      .line<YearValue>()
      .x((d) => x(d.year))
      .y((d) => y(d.value))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(series)
      .attr("d", area)
      .attr("fill", "var(--coral)")
      .attr("fill-opacity", 0.12);

    g.append("path")
      .datum(series)
      .attr("d", line)
      .attr("fill", "none")
      .attr("stroke", "var(--coral)")
      .attr("stroke-width", 2);

    g.append("g")
      .attr("transform", `translate(0,${h})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(5).tickSizeOuter(0))
      .call((sel) => sel.select(".domain").attr("stroke", "rgba(238,242,238,0.15)"))
      .selectAll("text")
      .attr("font-family", "var(--font-data)")
      .attr("font-size", 9)
      .attr("fill", "rgba(238,242,238,0.6)");

    g.append("g")
      .call(d3.axisLeft(y).ticks(4).tickSizeOuter(0))
      .call((sel) => sel.select(".domain").remove())
      .selectAll("text")
      .attr("font-family", "var(--font-data)")
      .attr("font-size", 10)
      .attr("fill", "rgba(238,242,238,0.6)");
  }, [width, height]);

  return (
    <div ref={wrapRef} className="h-full w-full">
      <svg ref={svgRef} width={width} height={height} />
    </div>
  );
}