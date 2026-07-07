"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { YearValue } from "@/types";
import { useDimensions } from "@/hooks/useDimensions";
import tempAvg from "@/data/temperature_pacific_avg.json";

const data = tempAvg as YearValue[];

export function WarmingStripes() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { width, height } = useDimensions(wrapRef);

  useEffect(() => {
    if (!svgRef.current || width === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const x = d3
      .scaleBand()
      .domain(data.map((d) => String(d.year)))
      .range([0, width])
      .padding(0);

    const extent = d3.extent(data, (d) => d.value) as [number, number];
    const color = d3
      .scaleSequential(d3.interpolateRgbBasis(["#2c7a79", "#eef2ee", "#d99a3d", "#e2603d"]))
      .domain(extent);

    svg
      .selectAll("rect")
      .data(data)
      .join("rect")
      .attr("x", (d) => x(String(d.year))!)
      .attr("y", 0)
      .attr("width", Math.max(1, x.bandwidth()))
      .attr("height", height)
      .attr("fill", (d) => color(d.value));
  }, [width, height]);

  const first = data[0];
  const last = data[data.length - 1];

  return (
    <div className="w-full">
      <div ref={wrapRef} className="h-14 w-full overflow-hidden rounded-sm">
        <svg ref={svgRef} width={width} height={56} />
      </div>
      <div className="mt-1.5 flex justify-between">
        <span className="eyebrow text-ink/45">{first.year}</span>
        <span className="eyebrow text-ink/45">{last.year}</span>
      </div>
    </div>
  );
}