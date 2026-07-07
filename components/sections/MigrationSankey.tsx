"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { sankey, sankeyLinkHorizontal, SankeyNodeMinimal, SankeyLinkMinimal } from "d3-sankey";
import { useDimensions } from "@/hooks/useDimensions";
import { MigrationData } from "@/types";
import migration from "@/data/migration_placeholder.json";


const data = migration as MigrationData;

const ORIGIN_CODES = new Set([
  "Kiribati",
  "Tuvalu",
  "Marshall Islands",
  "Fiji",
  "Solomon Islands",
  "Vanuatu",
]);

type NodeExtra = { name: string };
type LinkExtra = { value: number };

export function MigrationSankey() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { width, height } = useDimensions(wrapRef);

  useEffect(() => {
    if (!svgRef.current || width === 0 || height === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const nodes = data.nodes.map((n) => ({ name: n.id }));
    const nameToIndex = new Map(nodes.map((n, i) => [n.name, i]));
    const links = data.links.map((l) => ({
      source: nameToIndex.get(l.source)!,
      target: nameToIndex.get(l.target)!,
      value: l.value,
    }));

    const sankeyGen = sankey<NodeExtra, LinkExtra>()
      .nodeWidth(14)
      .nodePadding(16)
      .extent([
        [1, 8],
        [width - 1, height - 8],
      ]);

    const graph = sankeyGen({
      nodes: nodes.map((d) => ({ ...d })),
      links: links.map((d) => ({ ...d })),
    });

    const color = (name: string) =>
      ORIGIN_CODES.has(name) ? "var(--coral)" : "var(--lagoon)";

    svg
      .append("g")
      .attr("fill", "none")
      .selectAll("path")
      .data(graph.links as (SankeyLinkMinimal<NodeExtra, LinkExtra> & LinkExtra)[])
      .join("path")
      .attr("d", sankeyLinkHorizontal())
      .attr("stroke", (d) => color((d.source as any).name))
      .attr("stroke-opacity", 0.28)
      .attr("stroke-width", (d) => Math.max(1, d.width ?? 1))
      .transition()
      .duration(900)
      .attr("stroke-opacity", 0.38);

    const node = svg
      .append("g")
      .selectAll("g")
      .data(graph.nodes as (SankeyNodeMinimal<NodeExtra, LinkExtra> & NodeExtra)[])
      .join("g");

    node
      .append("rect")
      .attr("x", (d) => d.x0!)
      .attr("y", (d) => d.y0!)
      .attr("height", (d) => Math.max(1, (d.y1 ?? 0) - (d.y0 ?? 0)))
      .attr("width", (d) => (d.x1 ?? 0) - (d.x0 ?? 0))
      .attr("fill", (d) => color(d.name))
      .attr("rx", 2);

    node
      .append("text")
      .attr("x", (d) => (d.x0! < width / 2 ? d.x1! + 8 : d.x0! - 8))
      .attr("y", (d) => ((d.y0 ?? 0) + (d.y1 ?? 0)) / 2)
      .attr("dy", "0.32em")
      .attr("text-anchor", (d) => (d.x0! < width / 2 ? "start" : "end"))
      .attr("font-family", "var(--font-body)")
      .attr("font-size", 12)
      .attr("fill", "var(--foam)")
      .attr("opacity", 0.9)
      .text((d) => d.name);
  }, [width, height]);

  return (
    <div ref={wrapRef} className="h-full w-full">
      <svg ref={svgRef} width={width} height={height} />
    </div>
  );
}