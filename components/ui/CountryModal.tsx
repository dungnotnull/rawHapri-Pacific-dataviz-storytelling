"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { useDimensions } from "@/hooks/useDimensions";
import { GhgCountry, TempCountry } from "@/types";
import ghgData from "@/data/ghg_per_capita.json";
import tempData from "@/data/temperature_anomaly.json";
import picCountries from "@/data/pic_countries.json";
import seaLevelData from "@/data/sea_level.json";
import { getFlagClass } from "@/lib/flags";
import { createPortal } from "react-dom";

interface CountryModalProps {
  isOpen: boolean;
  onClose: () => void;
  countryCode: string;
  countryName: string;
}

const ghg = ghgData as GhgCountry[];
const temp = tempData as TempCountry[];
const picCoords = picCountries as Array<{
  code: string;
  name: string;
  lat: number;
  lon: number;
}>;

export function CountryModal({
  isOpen,
  onClose,
  countryCode,
  countryName,
}: CountryModalProps) {
  const countryGhg = ghg.find((c) => c.code === countryCode);
  const countryTemp = temp.find((c) => c.code === countryCode);
  const countryPic = picCoords.find((p) => p.code === countryCode);

  const slName = countryName === 'Micronesia' ? 'Micronesia, Federated State of' : countryName;
  const countrySl = (seaLevelData as any)[slName];
  const latestSl = countrySl && countrySl.series && countrySl.series.length > 0
    ? countrySl.series[countrySl.series.length - 1]
    : null;

  const flagClass = getFlagClass(countryCode);

  // Block body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    // Cleanup
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/50 px-4 py-6 sm:px-6"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-ink/10 bg-foam p-6 shadow-2xl"
        style={{
          position: "relative",
          zIndex: 1001,
          margin: "auto",
          maxWidth: "48rem",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {flagClass && <span className={`text-4xl ${flagClass}`}></span>}
            <div>
              <h3 className="font-display text-2xl font-medium text-ink">
                {countryName}
              </h3>
              <p className="mt-1 text-sm text-ink/60">
                {countryCode}
                {countryPic && (
                  <span className="ml-2">
                    · {countryPic.lat.toFixed(2)}°N, {countryPic.lon.toFixed(2)}
                    °E
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-ink/60 hover:bg-ink/5"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Current Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-ink/8 bg-white/40 p-4">
            <p className="eyebrow text-ink/60">CO₂ per capita (Latest)</p>
            <p className="mt-2 font-display text-3xl font-medium text-coral">
              {countryGhg?.latest_value
                ? countryGhg.latest_value.toFixed(2)
                : "N/A"}
              <span className="ml-1 text-lg text-ink/50">t</span>
            </p>
            <p className="mt-1 text-xs text-ink/50">
              Data from {countryGhg?.latest_year || "N/A"}
            </p>
          </div>
          <div className="rounded-xl border border-ink/8 bg-white/40 p-4">
            <p className="eyebrow text-ink/60">Temp Anomaly (Latest)</p>
            <p className="mt-2 font-display text-3xl font-medium text-lagoon">
              {countryTemp?.latest_value !== undefined &&
              countryTemp?.latest_value !== null
                ? (countryTemp.latest_value > 0 ? "+" : "") +
                  countryTemp.latest_value.toFixed(1) +
                  "°C"
                : "N/A"}
            </p>
            <p className="mt-1 text-xs text-ink/50">vs. baseline period</p>
          </div>
          <div className="rounded-xl border border-ink/8 bg-white/40 p-4">
            <p className="eyebrow text-ink/60">Sea Level (Latest)</p>
            <p className="mt-2 font-display text-3xl font-medium text-[#3b82f6]">
              {latestSl !== null
                ? (latestSl.value > 0 ? "+" : "") +
                  (latestSl.value * 1000).toFixed(0) +
                  "mm"
                : "N/A"}
            </p>
            <p className="mt-1 text-xs text-ink/50">
              Data from {latestSl?.year || "N/A"}
            </p>
          </div>
        </div>

        {/* Historical Chart - Combined */}
        <div className="mt-6">
          <p className="mb-2 text-sm font-medium text-ink/70">
            CO₂, Temperature & Sea Level (2016–2023)
          </p>
          <CombinedChart countryCode={countryCode} />
        </div>

        {/* Info */}
        <div className="mt-6 rounded-xl border border-ink/8 bg-white/40 p-4">
          <p className="text-sm text-ink/70">
            <strong>Data sources:</strong> Pacific Data Hub GHG and temperature
            indicators. CO₂ emissions shown in tonnes per capita per year.
            Temperature anomaly shown as deviation from baseline period.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// Combined Chart Component - Shows both CO2 and Temp on same chart
function CombinedChart({ countryCode }: { countryCode: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { width, height } = useDimensions(wrapRef);

  useEffect(() => {
    if (!svgRef.current || width === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const countryGhg = ghg.find((c) => c.code === countryCode);
    const countryTemp = temp.find((c) => c.code === countryCode);
    const countryNameMap = countryGhg?.name || "";
    const slName = countryNameMap === 'Micronesia' ? 'Micronesia, Federated State of' : countryNameMap;
    const countrySl = (seaLevelData as any)[slName];

    const margin = { top: 20, right: 100, bottom: 40, left: 55 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // X scale - years from 2016 to 2023
    const x = d3.scaleLinear().domain([2016, 2023]).range([0, w]);

    // Left Y scale - CO2 (0 to max)
    const maxGhg =
      countryGhg && countryGhg.series
        ? d3.max(countryGhg.series, (d) => d.value)! * 1.1
        : 20;
    const yGhg = d3.scaleLinear().domain([0, maxGhg]).range([h, 0]);

    // Right Y scale - Temperature (min to max)
    const allTemp =
      countryTemp && countryTemp.decades
        ? countryTemp.decades.map((d) => d.value)
        : [0, 5];
    const tempExtent = d3.extent(allTemp) as [number, number];
    const yTemp = d3
      .scaleLinear()
      .domain([tempExtent[0] - 0.5, tempExtent[1] + 0.5])
      .range([h, 0]);

    // Right-Right Y scale - Sea Level (min to max)
    const allSl = countrySl && countrySl.series
      ? countrySl.series.map((d: any) => d.value)
      : [-0.2, 0.5];
    const slExtent = d3.extent(allSl) as unknown as [number, number];
    const ySl = d3
      .scaleLinear()
      .domain([(slExtent[0] ?? -0.2) - 0.1, (slExtent[1] ?? 0.5) + 0.2])
      .range([h, 0]);

    // Draw grid lines
    g.append("g")
      .selectAll("line")
      .data(yGhg.ticks(5))
      .join("line")
      .attr("x1", 0)
      .attr("x2", w)
      .attr("y1", (d) => yGhg(d as number))
      .attr("y2", (d) => yGhg(d as number))
      .attr("stroke", "rgba(14,42,44,0.08)")
      .attr("stroke-width", 1);

    // Draw CO2 line
    if (countryGhg && countryGhg.series && countryGhg.series.length > 0) {
      const ghgLine = d3
        .line<(typeof countryGhg.series)[0]>()
        .x((d) => x(d.year))
        .y((d) => yGhg(d.value))
        .curve(d3.curveMonotoneX);

      g.append("path")
        .datum(countryGhg.series)
        .attr("d", ghgLine)
        .attr("fill", "none")
        .attr("stroke", "var(--coral)")
        .attr("stroke-width", 2.5);

      // CO2 dot at latest year
      const lastGhg = countryGhg.series[countryGhg.series.length - 1];
      if (lastGhg) {
        g.append("circle")
          .attr("cx", x(lastGhg.year))
          .attr("cy", yGhg(lastGhg.value))
          .attr("r", 4)
          .attr("fill", "var(--coral)")
          .attr("stroke", "#fff")
          .attr("stroke-width", 2);
      }
    }

    // Draw Temperature line
    if (countryTemp && countryTemp.decades && countryTemp.decades.length > 0) {
      const tempLine = d3
        .line<(typeof countryTemp.decades)[0]>()
        .x((d) => x(d.decade))
        .y((d) => yTemp(d.value))
        .curve(d3.curveMonotoneX);

      g.append("path")
        .datum(countryTemp.decades)
        .attr("d", tempLine)
        .attr("fill", "none")
        .attr("stroke", "var(--lagoon)")
        .attr("stroke-width", 2.5);

      // Temp dot at latest decade
      const lastTemp = countryTemp.decades[countryTemp.decades.length - 1];
      if (lastTemp) {
        g.append("circle")
          .attr("cx", x(lastTemp.decade))
          .attr("cy", yTemp(lastTemp.value))
          .attr("r", 4)
          .attr("fill", "var(--lagoon)")
          .attr("stroke", "#fff")
          .attr("stroke-width", 2);
      }
    }

    // Draw Sea Level line
    if (countrySl && countrySl.series && countrySl.series.length > 0) {
      const slLine = d3
        .line<(typeof countrySl.series)[0]>()
        .x((d) => x(d.year))
        .y((d) => ySl(d.value))
        .curve(d3.curveMonotoneX);

      // Add a subtle area under the sea level line
      const slArea = d3
        .area<(typeof countrySl.series)[0]>()
        .x((d) => x(d.year))
        .y0(h)
        .y1((d) => ySl(d.value))
        .curve(d3.curveMonotoneX);

      g.append("path")
        .datum(countrySl.series)
        .attr("d", slArea)
        .attr("fill", "#3b82f6")
        .attr("fill-opacity", 0.1);

      g.append("path")
        .datum(countrySl.series)
        .attr("d", slLine)
        .attr("fill", "none")
        .attr("stroke", "#3b82f6")
        .attr("stroke-width", 2);

      // Sea Level dot at latest year
      const lastSl = countrySl.series[countrySl.series.length - 1];
      if (lastSl) {
        g.append("circle")
          .attr("cx", x(lastSl.year))
          .attr("cy", ySl(lastSl.value))
          .attr("r", 4)
          .attr("fill", "#3b82f6")
          .attr("stroke", "#fff")
          .attr("stroke-width", 2);
      }
    }

    // X axis
    g.append("g")
      .attr("transform", `translate(0,${h})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format("d")))
      .selectAll("text")
      .attr("font-size", 10)
      .attr("fill", "rgba(14,42,44,0.6)");

    // Left Y axis - CO2
    const yAxisLeft = d3.axisLeft(yGhg).ticks(5);
    g.append("g")
      .call(yAxisLeft)
      .selectAll("text")
      .attr("font-size", 10)
      .attr("fill", "rgba(14,42,44,0.6)");
    g.selectAll(".domain").attr("stroke", "rgba(14,42,44,0.2)");
    g.selectAll(".tick line").attr("stroke", "rgba(14,42,44,0.2)");

    // Right Y axis - Temperature
    const yAxisRight = d3.axisRight(yTemp).ticks(5);
    g.append("g")
      .attr("transform", `translate(${w},0)`)
      .call(yAxisRight)
      .selectAll("text")
      .attr("font-size", 10)
      .attr("fill", "rgba(14,42,44,0.6)");
    g.selectAll(".domain").attr("stroke", "rgba(14,42,44,0.2)");

    // Axis labels
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -45)
      .attr("x", -h / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", 11)
      .attr("fill", "var(--coral)")
      .text("CO₂ per capita (t)");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", w + 35)
      .attr("x", -h / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", 11)
      .attr("fill", "var(--lagoon)")
      .text("Temp Anomaly (°C)");

    // Right-Right Y axis - Sea Level
    const yAxisSl = d3.axisRight(ySl).ticks(5);
    g.append("g")
      .attr("transform", `translate(${w + 50},0)`)
      .call(yAxisSl)
      .selectAll("text")
      .attr("font-size", 10)
      .attr("fill", "#3b82f6");
    g.selectAll(".domain").attr("stroke", "rgba(14,42,44,0.2)");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", w + 85)
      .attr("x", -h / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", 11)
      .attr("fill", "#3b82f6")
      .text("Sea Level (m)");

    // Legend
    const legend = g.append("g").attr("transform", `translate(${w - 180}, 10)`);

    legend.append("circle").attr("r", 4).attr("fill", "var(--coral)");

    legend
      .append("text")
      .attr("x", 10)
      .attr("y", 4)
      .attr("font-size", 10)
      .attr("fill", "rgba(14,42,44,0.7)")
      .text("CO₂");

    legend
      .append("circle")
      .attr("cx", 50)
      .attr("r", 4)
      .attr("fill", "var(--lagoon)");

    legend
      .append("text")
      .attr("x", 60)
      .attr("y", 4)
      .attr("font-size", 10)
      .attr("fill", "rgba(14,42,44,0.7)")
      .text("Temp");

    legend
      .append("circle")
      .attr("cx", 105)
      .attr("r", 4)
      .attr("fill", "#3b82f6");

    legend
      .append("text")
      .attr("x", 115)
      .attr("y", 4)
      .attr("font-size", 10)
      .attr("fill", "rgba(14,42,44,0.7)")
      .text("Sea Level");
  }, [width, height, countryCode]);

  return (
    <div ref={wrapRef} className="h-56 w-full">
      <svg ref={svgRef} width={width} height={height} />
    </div>
  );
}
