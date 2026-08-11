"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import {
  ghgData,
  tempAnomalyData,
  seaLevelData,
  CORRELATION_YEARS,
  shortName,
} from "@/lib/data";
import { makePalette } from "@/lib/colors";
import Flag from "@/components/ui/Flag";
import YearScrubber from "@/components/ui/YearScrubber";

// ─── Data helpers ────────────────────────────────────────────────────────────

const SL_TO_NORM: Record<string, string> = {
  "Micronesia, Federated State of": "Micronesia",
};

const COUNTRIES = (() => {
  const ghgMap = new Map(ghgData.map((d) => [d.name, d]));
  const tMap = new Map(tempAnomalyData.map((d) => [d.name, d]));
  return Object.keys(seaLevelData)
    .filter((sl) => {
      const n = SL_TO_NORM[sl] ?? sl;
      return ghgMap.has(n) && tMap.has(n);
    })
    .map((sl) => ({
      slName: sl,
      normName: SL_TO_NORM[sl] ?? sl,
      iso2: seaLevelData[sl].iso2,
    }));
})();

const COUNTRY_NAMES = COUNTRIES.map((c) => c.slName);

const _ghg = new Map(ghgData.map((d) => [d.name, d]));
const _tmp = new Map(tempAnomalyData.map((d) => [d.name, d]));

const getGhg = (n: string, y: number) =>
  _ghg.get(n)?.series.find((s) => s.year === y)?.value ?? null;
const getTmp = (n: string, y: number) =>
  _tmp.get(n)?.series.find((s) => s.year === y)?.value ?? null;
const getSl = (n: string, y: number) => {
  const pt = seaLevelData[n]?.series.find((s) => s.year === y);
  return pt !== undefined ? pt.value * 1000 : null;
};

// ─── Pearson r (module-level, never recreated) ───────────────────────────────
// r(X,Y) = Σ(xi − x̄)(yi − ȳ) / sqrt[Σ(xi−x̄)² · Σ(yi−ȳ)²]

function pearsonR(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 3) return NaN;
  const mx = xs.reduce((s, x) => s + x, 0) / n;
  const my = ys.reduce((s, y) => s + y, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    num += dx * dy; dx2 += dx * dx; dy2 += dy * dy;
  }
  return dx2 === 0 || dy2 === 0 ? 0 : num / Math.sqrt(dx2 * dy2);
}

// ─── Linear Regression (normalized) ─────────────────────────────────────────
function linearRegression(xs: number[], ys: number[]) {
  const n = xs.length;
  if (n < 2) return null;
  const mx = xs.reduce((s, x) => s + x, 0) / n;
  const my = ys.reduce((s, y) => s + y, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    num += dx * dy;
    den += dx * dx;
  }
  if (den === 0) return null;
  const m = num / den;
  const b = my - m * mx;
  
  const pts: {x: number, y: number}[] = [];
  if (b >= 0 && b <= 1) pts.push({x: 0, y: b});
  if (m + b >= 0 && m + b <= 1) pts.push({x: 1, y: m + b});
  if (m !== 0) {
    const x0 = -b / m;
    if (x0 > 0 && x0 < 1) pts.push({x: x0, y: 0});
    const x1 = (1 - b) / m;
    if (x1 > 0 && x1 < 1) pts.push({x: x1, y: 1});
  }
  
  if (pts.length >= 2) return [pts[0], pts[1]];
  return null;
}

// ─── 3-D perspective projection ──────────────────────────────────────────────
// Inputs: normalized coordinates in [0, 1]³
// az  = azimuth  (rotation around world-Y)
// el  = elevation (tilt around world-X)
// Returns 2-D screen position + depth for z-sorting.

function project(
  nx: number, ny: number, nz: number,
  az: number, el: number,
  cx: number, cy: number, scale: number
): { sx: number; sy: number; depth: number } {
  // Centre cube at origin
  const x = nx - 0.5, y = ny - 0.5, z = nz - 0.5;

  // Rotate around world-Y (azimuth)
  const cosA = Math.cos(az), sinA = Math.sin(az);
  const rx = x * cosA + z * sinA;
  const rz1 = -x * sinA + z * cosA;

  // Rotate around world-X (elevation)
  const cosE = Math.cos(el), sinE = Math.sin(el);
  const ry = y * cosE - rz1 * sinE;
  const rz = y * sinE + rz1 * cosE;

  // Mild perspective divide
  const d = 3.5;
  const persp = d / (d + rz + 0.5);

  return {
    sx: cx + rx * scale * persp,
    sy: cy - ry * scale * persp,
    depth: rz,
  };
}

const TRAIL_LEN = 8;

// Bounding cube vertices (8 corners) and the 12 edges connecting them
const CUBE_VERTS: [number, number, number][] = [
  [0,0,0],[1,0,0],[1,1,0],[0,1,0],
  [0,0,1],[1,0,1],[1,1,1],[0,1,1],
];
const CUBE_EDGES = [
  [0,1],[1,2],[2,3],[3,0], // bottom face
  [4,5],[5,6],[6,7],[7,4], // top face
  [0,4],[1,5],[2,6],[3,7], // vertical pillars
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function CorrelationBubble() {
  const palette = useMemo(() => makePalette(COUNTRY_NAMES), []);
  const [year, setYear] = useState(CORRELATION_YEARS[CORRELATION_YEARS.length - 1]);
  const [hover, setHover] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 700, h: 460 });

  // Rotation state
  const [az, setAz] = useState(-0.55);   // azimuth  (radians)
  const [el, setEl] = useState(0.42);    // elevation (radians)
  const [autoRot, setAutoRot] = useState(true);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const resumeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Resize observer ─────────────────────────────────────────────────────────
  useEffect(() => {
    const ro = new ResizeObserver((es) => {
      for (const e of es) {
        const w = e.contentRect.width;
        setSize({ w, h: Math.min(520, Math.max(340, w * 0.62)) });
      }
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // ── Auto-rotation (~20 fps to keep React happy) ──────────────────────────
  useEffect(() => {
    if (!autoRot) return;
    let id: number;
    let lastT = 0;
    const tick = (t: number) => {
      if (t - lastT > 50) {
        lastT = t;
        setAz((a) => a + 0.012);
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [autoRot]);

  // ── Drag to rotate ───────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    if (resumeRef.current) clearTimeout(resumeRef.current);
    setAutoRot(false);
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setAz((a) => a + dx * 0.011);
    setEl((ev) => Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, ev - dy * 0.011)));
  }, []);

  const onMouseUp = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    resumeRef.current = setTimeout(() => setAutoRot(true), 3000);
  }, []);

  // ── Touch to rotate (mobile) ─────────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    dragging.current = true;
    lastPos.current = { x: t.clientX, y: t.clientY };
    if (resumeRef.current) clearTimeout(resumeRef.current);
    setAutoRot(false);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging.current) return;
    const t = e.touches[0];
    const dx = t.clientX - lastPos.current.x;
    const dy = t.clientY - lastPos.current.y;
    lastPos.current = { x: t.clientX, y: t.clientY };
    setAz((a) => a + dx * 0.011);
    setEl((ev) => Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, ev - dy * 0.011)));
  }, []);

  const onTouchEnd = useCallback(() => {
    dragging.current = false;
    resumeRef.current = setTimeout(() => setAutoRot(true), 3000);
  }, []);

  // ── Stable scales (normalise raw values → [0, 1]) ───────────────────────
  const { xNorm, yNorm, zNorm, xTicks, yTicks, zTicks } = useMemo(() => {
    const gs: number[] = [], ss: number[] = [], ts: number[] = [];
    for (const yr of CORRELATION_YEARS) {
      for (const { slName, normName } of COUNTRIES) {
        const g = getGhg(normName, yr);
        const s = getSl(slName, yr);
        const t = getTmp(normName, yr);
        if (g !== null) gs.push(g);
        if (s !== null) ss.push(s);
        if (t !== null) ts.push(t);
      }
    }
    const xNorm = d3.scaleLinear().domain([0, (d3.max(gs) ?? 10) * 1.04]).range([0, 1]);
    const [sMin, sMax] = d3.extent(ss) as [number, number];
    const pad = (sMax - sMin) * 0.08 || 5;
    const yNorm = d3.scaleLinear().domain([sMin - pad, sMax + pad]).range([0, 1]);
    const [tMin, tMax] = d3.extent(ts) as [number, number];
    const zNorm = d3.scaleLinear().domain([tMin, tMax]).range([0, 1]);
    return {
      xNorm, yNorm, zNorm,
      xTicks: xNorm.ticks(5),
      yTicks: yNorm.ticks(5),
      zTicks: zNorm.ticks(4),
    };
  }, []);

  // ── Projection helper for current rotation ───────────────────────────────
  const { w, h } = size;
  const cx = w / 2 + 10;
  const cy = h / 2 + 30;
  const scale = Math.min(w, h) * 0.67;

  const p = useCallback(
    (nx: number, ny: number, nz: number) =>
      project(nx, ny, nz, az, el, cx, cy, scale),
    [az, el, cx, cy, scale]
  );

  // ── Per-frame data ───────────────────────────────────────────────────────
  const rawPoints = useMemo(() =>
    COUNTRIES.map(({ slName, normName, iso2 }) => {
      const ghg = getGhg(normName, year);
      const sl = getSl(slName, year);
      const temp = getTmp(normName, year);
      const trail = CORRELATION_YEARS
        .filter((y) => y <= year)
        .slice(-TRAIL_LEN)
        .flatMap((y) => {
          const g = getGhg(normName, y);
          const s = getSl(slName, y);
          const t = getTmp(normName, y);
          return g !== null && s !== null && t !== null
            ? [{ g, s, t, year: y }]
            : [];
        });
      return { slName, normName, iso2, ghg, sl, temp, trail };
    }),
    [year]
  );

  // ── Project & depth-sort (far first so near renders on top) ─────────────
  const pts = useMemo(() => {
    return rawPoints
      .map((rp) => {
        const trailPjs = rp.trail.map((tr) =>
          p(xNorm(tr.g), yNorm(tr.s), zNorm(tr.t))
        );
        if (rp.ghg === null || rp.sl === null || rp.temp === null) {
          return { ...rp, pj: null as null, trailPjs };
        }
        const pj = p(xNorm(rp.ghg), yNorm(rp.sl), zNorm(rp.temp));
        return { ...rp, pj, trailPjs };
      })
      .sort((a, b) => (a.pj?.depth ?? 0) - (b.pj?.depth ?? 0));
  }, [rawPoints, p, xNorm, yNorm, zNorm]);

  // ── Pearson r and Linear Regression for all 3 pairs ──────────────────────
  const corr = useMemo(() => {
    const full = rawPoints.filter(
      (rp) => rp.ghg !== null && rp.sl !== null && rp.temp !== null
    ) as Array<{ ghg: number; sl: number; temp: number }>;
    if (full.length < 3) return null;
    const g = full.map((p) => p.ghg);
    const s = full.map((p) => p.sl);
    const t = full.map((p) => p.temp);
    
    const ng = g.map(xNorm);
    const ns = s.map(yNorm);
    const nt = t.map(zNorm);

    return {
      rGhgSl: pearsonR(g, s),
      rGhgTemp: pearsonR(g, t),
      rTempSl: pearsonR(t, s),
      regs: {
        ghgSl: linearRegression(ng, ns),
        ghgTemp: linearRegression(ng, nt),
        tempSl: linearRegression(nt, ns),
      },
      n: full.length,
    };
  }, [rawPoints, xNorm, yNorm, zNorm]);

  // ── Derived 3-D geometry ─────────────────────────────────────────────────
  // Cube corners
  const cube = CUBE_VERTS.map(([x, y, z]) => p(x, y, z));

  // Axis endpoints
  const o = p(0, 0, 0);
  const eX = p(1, 0, 0);
  const eY = p(0, 1, 0);
  const eZ = p(0, 0, 1);

  // Y=0 baseline plane polygon
  const yZero = yNorm(0);
  const baseVerts = [[0, yZero, 0], [1, yZero, 0], [1, yZero, 1], [0, yZero, 1]].map(
    ([x, y, z]) => p(x, y, z)
  );
  const basePath =
    `M${baseVerts[0].sx},${baseVerts[0].sy}` +
    baseVerts.slice(1).map((v) => ` L${v.sx},${v.sy}`).join("") +
    " Z";

  // Floor grid (XZ plane at Y=0)
  const floorLines: { x1:number; y1:number; x2:number; y2:number }[] = [];
  for (let i = 0; i <= 5; i++) {
    const t = i / 5;
    const a = p(t, 0, 0), b = p(t, 0, 1);
    const c = p(0, 0, t), dd = p(1, 0, t);
    floorLines.push({ x1: a.sx, y1: a.sy, x2: b.sx, y2: b.sy });
    floorLines.push({ x1: c.sx, y1: c.sy, x2: dd.sx, y2: dd.sy });
  }

  // Axis labels (slightly beyond endpoints)
  const lbX = p(1.14, -0.02, 0);
  const lbY = p(0, 1.14, 0);
  const lbZ = p(0, -0.02, 1.14);

  // Tooltip
  const hoveredPt = hover ? pts.find((pt) => pt.slName === hover) : null;

  // ── Badge helper ──────────────────────────────────────────────────────────
  const badge = (r: number) => ({
    val: `${r >= 0 ? "+" : ""}${r.toFixed(3)}`,
    label:
      Math.abs(r) > 0.7 ? "strong"
      : Math.abs(r) > 0.4 ? "moderate"
      : Math.abs(r) > 0.2 ? "weak"
      : "negligible",
    dir: r >= 0 ? "↑" : "↓",
    color:
      Math.abs(r) > 0.6 ? "#4ade80"
      : Math.abs(r) > 0.3 ? "var(--gold)"
      : "var(--ink-dim)",
  });

  return (
    <section id="part1-correlation" className="relative px-6 py-14 md:px-16">
      <div className="mx-auto max-w-6xl">
        {/* ── Header ── */}
        <div className="flex flex-wrap gap-6 items-start justify-between">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl max-w-3xl">
              The Climate Triangle
            </h2>
            <p className="mt-3 max-w-2xl text-sm sm:text-base text-ink-dim leading-relaxed">
              Three climate indicators per Pacific nation in 3-D space.{" "}
              <span className="font-semibold" style={{ color: "var(--gold)" }}>X</span>{" "}
              = GHG/cap ·{" "}
              <span className="font-semibold text-lagoon">Y</span> = Sea level (mm) ·{" "}
              <span className="font-semibold" style={{ color: "#f87171" }}>Z</span>{" "}
              = Temp anomaly (°C). Drag to rotate · Press{" "}
              <span className="text-lagoon font-semibold">Play</span> to animate{" "}
              {CORRELATION_YEARS[0]} → {CORRELATION_YEARS[CORRELATION_YEARS.length - 1]}.
            </p>

            {/* ── 3-pair Pearson r badges ── */}
            {corr && (
              <div className="mt-4 flex flex-wrap gap-2">
                {(
                  [
                    { label: "GHG ↔ Sea Level", r: corr.rGhgSl },
                    { label: "GHG ↔ Temp",      r: corr.rGhgTemp },
                    { label: "Temp ↔ Sea Level", r: corr.rTempSl },
                  ] as const
                ).map(({ label, r }) => {
                  const b = badge(r);
                  return (
                    <div
                      key={label}
                      className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-paper/60 px-3 py-1 backdrop-blur"
                    >
                      <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-faint">
                        {label}
                      </span>
                      <span
                        className="font-mono text-[13px] font-bold tabular-nums"
                        style={{ color: b.color }}
                      >
                        {b.val}
                      </span>
                      <span className="font-mono text-[9px] text-ink-faint">
                        {b.label} {b.dir}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Main grid ── */}
        <div className="mt-8 grid lg:grid-cols-[1fr_auto_200px] gap-4 items-start">

          {/* ── 3-D Chart ── */}
          <div
            ref={containerRef}
            className="chart-paper rounded-xl overflow-hidden relative select-none cursor-grab active:cursor-grabbing"
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {/* Drag hint */}
            <div className="absolute top-3 right-3 z-10 font-mono text-[9px] text-ink-faint/50 uppercase tracking-widest pointer-events-none">
              ⟲ drag to rotate
            </div>

            {/* Hover tooltip */}
            {hoveredPt?.pj && (
              <div className="absolute top-3 left-3 z-10 rounded-lg bg-paper-raised/95 border border-ink/10 px-3 py-2 backdrop-blur-sm pointer-events-none">
                <div className="flex items-center gap-2 mb-1">
                  <Flag iso2={hoveredPt.iso2} className="w-5 h-3.5 shrink-0" />
                  <span className="font-mono text-xs font-semibold text-ink">
                    {shortName(hoveredPt.slName)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                  <span className="font-mono text-[10px] text-ink-faint">GHG/cap</span>
                  <span className="font-mono text-[10px] tabular-nums" style={{ color: "var(--gold)" }}>
                    {hoveredPt.ghg?.toFixed(2)} t
                  </span>
                  <span className="font-mono text-[10px] text-ink-faint">Sea level</span>
                  <span className="font-mono text-[10px] text-lagoon tabular-nums">
                    {hoveredPt.sl !== null
                      ? `${hoveredPt.sl >= 0 ? "+" : ""}${hoveredPt.sl.toFixed(0)} mm`
                      : "—"}
                  </span>
                  <span className="font-mono text-[10px] text-ink-faint">Temp Δ</span>
                  <span
                    className="font-mono text-[10px] tabular-nums"
                    style={{ color: "#f87171" }}
                  >
                    {hoveredPt.temp?.toFixed(2)} °C
                  </span>
                </div>
              </div>
            )}

            <svg
              width="100%"
              height={h}
              viewBox={`0 0 ${w} ${h}`}
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <radialGradient id="bubble3d-glow" cx="35%" cy="30%" r="60%">
                  <stop offset="0%" stopColor="white" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="white" stopOpacity={0} />
                </radialGradient>
                <filter id="soft-glow">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* ── Floor grid (Y-min plane) ── */}
              {floorLines.map((l, i) => (
                <line
                  key={i}
                  x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                  stroke="var(--ink-faint)" strokeWidth={0.4} opacity={0.2}
                />
              ))}

              {/* ── Bounding cube (12 edges) ── */}
              {CUBE_EDGES.map(([a, b], i) => {
                const pa = cube[a], pb = cube[b];
                const avgD = (pa.depth + pb.depth) / 2;
                return (
                  <line
                    key={i}
                    x1={pa.sx} y1={pa.sy} x2={pb.sx} y2={pb.sy}
                    stroke="var(--ink-faint)"
                    strokeWidth={0.5}
                    opacity={0.07 + Math.max(0, avgD + 0.5) * 0.1}
                  />
                );
              })}

              {/* ── Sea-level = 0 baseline plane ── */}
              <path
                d={basePath}
                fill="var(--lagoon)"
                fillOpacity={0.04}
                stroke="var(--lagoon)"
                strokeWidth={0.8}
                strokeOpacity={0.2}
                strokeDasharray="4,6"
              />
              {/* ── Regression Lines ── */}
              {corr?.regs && (
                <g>
                  {corr.regs.ghgSl && (() => {
                    const [p1, p2] = corr.regs.ghgSl;
                    const a = p(p1.x, p1.y, 0), b = p(p2.x, p2.y, 0);
                    const bColor = badge(corr.rGhgSl).color;
                    const c = bColor === "var(--ink-dim)" ? "var(--ink)" : bColor;
                    const o = bColor === "var(--ink-dim)" ? 0.35 : 0.85;
                    return (
                      <g>
                        <line x1={a.sx} y1={a.sy} x2={b.sx} y2={b.sy} stroke={c} strokeWidth={1} strokeDasharray="6,5" opacity={o} />
                        <text x={b.sx} y={b.sy - 8} fontSize={9} fontFamily="var(--font-mono)" fill={c} opacity={o + 0.1} fontWeight={600} textAnchor="middle">
                          r={corr.rGhgSl.toFixed(2)}
                        </text>
                      </g>
                    );
                  })()}
                  {corr.regs.ghgTemp && (() => {
                    const [p1, p2] = corr.regs.ghgTemp;
                    const a = p(p1.x, 0, p1.y), b = p(p2.x, 0, p2.y);
                    const bColor = badge(corr.rGhgTemp).color;
                    const c = bColor === "var(--ink-dim)" ? "var(--ink)" : bColor;
                    const o = bColor === "var(--ink-dim)" ? 0.35 : 0.85;
                    return (
                      <g>
                        <line x1={a.sx} y1={a.sy} x2={b.sx} y2={b.sy} stroke={c} strokeWidth={1} strokeDasharray="6,5" opacity={o} />
                        <text x={b.sx} y={b.sy - 8} fontSize={9} fontFamily="var(--font-mono)" fill={c} opacity={o + 0.1} fontWeight={600} textAnchor="middle">
                          r={corr.rGhgTemp.toFixed(2)}
                        </text>
                      </g>
                    );
                  })()}
                  {corr.regs.tempSl && (() => {
                    const [p1, p2] = corr.regs.tempSl;
                    const a = p(0, p1.y, p1.x), b = p(0, p2.y, p2.x);
                    const bColor = badge(corr.rTempSl).color;
                    const c = bColor === "var(--ink-dim)" ? "var(--ink)" : bColor;
                    const o = bColor === "var(--ink-dim)" ? 0.35 : 0.85;
                    return (
                      <g>
                        <line x1={a.sx} y1={a.sy} x2={b.sx} y2={b.sy} stroke={c} strokeWidth={1} strokeDasharray="6,5" opacity={o} />
                        <text x={b.sx} y={b.sy - 8} fontSize={9} fontFamily="var(--font-mono)" fill={c} opacity={o + 0.1} fontWeight={600} textAnchor="middle">
                          r={corr.rTempSl.toFixed(2)}
                        </text>
                      </g>
                    );
                  })()}
                </g>
              )}
              {/* ── 3 Axes ── */}
              {/* X: GHG — gold */}
              <line x1={o.sx} y1={o.sy} x2={eX.sx} y2={eX.sy}
                stroke="var(--gold)" strokeWidth={1.8} opacity={0.85} />
              {/* Y: Sea Level — lagoon */}
              <line x1={o.sx} y1={o.sy} x2={eY.sx} y2={eY.sy}
                stroke="var(--lagoon)" strokeWidth={1.8} opacity={0.85} />
              {/* Z: Temperature — coral */}
              <line x1={o.sx} y1={o.sy} x2={eZ.sx} y2={eZ.sy}
                stroke="#f87171" strokeWidth={1.8} opacity={0.85} />

              {/* ── Axis labels ── */}
              <text x={lbX.sx} y={lbX.sy + 4} textAnchor="middle"
                fontSize={11} fontFamily="var(--font-mono)" fontWeight={600}
                fill="var(--gold)" opacity={0.9}>
                GHG/cap
              </text>
              <text x={lbY.sx} y={lbY.sy - 10} textAnchor="middle"
                fontSize={11} fontFamily="var(--font-mono)" fontWeight={600}
                fill="var(--lagoon)" opacity={0.9}>
                Sea Level
              </text>
              <text x={lbZ.sx + 8} y={lbZ.sy + 4} textAnchor="start"
                fontSize={11} fontFamily="var(--font-mono)" fontWeight={600}
                fill="#f87171" opacity={0.9}>
                Temp Δ
              </text>

              {/* ── X-axis ticks (GHG) ── */}
              {xTicks.map((v) => {
                const pt = p(xNorm(v), 0, 0);
                return (
                  <g key={`xt${v}`}>
                    <circle cx={pt.sx} cy={pt.sy} r={2} fill="var(--gold)" opacity={0.55} />
                    <text x={pt.sx} y={pt.sy + 14} textAnchor="middle"
                      fontSize={8} fontFamily="var(--font-mono)" fill="var(--gold)" opacity={0.6}>
                      {v}
                    </text>
                  </g>
                );
              })}

              {/* ── Y-axis ticks (Sea Level) ── */}
              {yTicks.map((v) => {
                const pt = p(0, yNorm(v), 0);
                return (
                  <g key={`yt${v}`}>
                    <circle cx={pt.sx} cy={pt.sy} r={2} fill="var(--lagoon)" opacity={0.55} />
                    <text x={pt.sx - 8} y={pt.sy + 4} textAnchor="end"
                      fontSize={8} fontFamily="var(--font-mono)" fill="var(--lagoon)" opacity={0.6}>
                      {v >= 0 ? "+" : ""}{v}
                    </text>
                  </g>
                );
              })}

              {/* ── Z-axis ticks (Temperature) ── */}
              {zTicks.map((v) => {
                const pt = p(0, 0, zNorm(v));
                return (
                  <g key={`zt${v}`}>
                    <circle cx={pt.sx} cy={pt.sy} r={2} fill="#f87171" opacity={0.55} />
                    <text x={pt.sx + 8} y={pt.sy + 4} textAnchor="start"
                      fontSize={8} fontFamily="var(--font-mono)" fill="#f87171" opacity={0.6}>
                      {v.toFixed(1)}°
                    </text>
                  </g>
                );
              })}

              {/* ── Year watermark ── */}
              <text x={w - 14} y={h - 14} textAnchor="end" fontSize={52}
                fontFamily="var(--font-display)" fill="var(--lagoon)" opacity={0.06}
                fontWeight={700} style={{ userSelect: "none", pointerEvents: "none" }}>
                {year}
              </text>

              {/* ── 3-D trail paths ── */}
              {pts.map(({ slName, trailPjs }) => {
                if (!trailPjs || trailPjs.length < 2) return null;
                const color = palette.get(slName) ?? "#888";
                const isHov = hover === slName;
                const d =
                  "M" + trailPjs.map((pt) => `${pt.sx},${pt.sy}`).join(" L");
                return (
                  <path
                    key={`trail-${slName}`}
                    d={d}
                    fill="none"
                    stroke={color}
                    strokeWidth={isHov ? 2 : 1}
                    opacity={
                      hover && !isHov ? 0.04
                      : isHov ? 0.75
                      : 0.28
                    }
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ transition: "opacity 200ms" }}
                  />
                );
              })}

              {/* ── Bubbles (depth-sorted, farthest first) ── */}
              {pts.map(({ slName, pj }) => {
                if (!pj) return null;
                const color = palette.get(slName) ?? "#888";
                const isHov = hover === slName;
                const R = 7;
                return (
                  <g
                    key={slName}
                    transform={`translate(${pj.sx},${pj.sy})`}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={() => setHover(slName)}
                    onMouseLeave={() => setHover(null)}
                  >
                    {/* Glow ring on hover */}
                    {isHov && (
                      <circle r={R + 10} fill="none" stroke={color}
                        strokeWidth={1.5} opacity={0.3} />
                    )}
                    {/* Main sphere */}
                    <circle
                      r={isHov ? R + 3 : R}
                      fill={color}
                      fillOpacity={isHov ? 0.95 : hover ? 0.18 : 0.82}
                      stroke={isHov ? "white" : color}
                      strokeWidth={isHov ? 1.5 : 0.5}
                      strokeOpacity={0.7}
                      style={{ transition: "r 250ms, fill-opacity 180ms" }}
                    />
                    {/* Highlight shine */}
                    <circle r={isHov ? R + 3 : R} fill="url(#bubble3d-glow)"
                      pointerEvents="none" style={{ transition: "r 250ms" }} />
                    {/* Label on hover */}
                    {isHov && (
                      <text y={-R - 6} textAnchor="middle" fontSize={10}
                        fontFamily="var(--font-mono)" fill={color}
                        style={{ pointerEvents: "none", fontWeight: 600 }}>
                        {shortName(slName)}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* ── Year scrubber (desktop) ── */}
          <div className="hidden lg:block">
            <YearScrubber
              years={CORRELATION_YEARS}
              year={year}
              onChange={setYear}
              speedMs={850}
              variant="vertical"
            />
          </div>

          {/* ── Country legend ── */}
          <div className="chart-paper rounded-xl p-4 h-fit lg:sticky lg:top-24">
            <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-faint block mb-3">
              Countries
            </span>
            <div className="flex flex-col gap-0.5 max-h-[440px] overflow-y-auto pr-1">
              {COUNTRIES.map(({ slName, iso2 }) => (
                <button
                  key={slName}
                  onMouseEnter={() => setHover(slName)}
                  onMouseLeave={() => setHover(null)}
                  className="flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-paper-raised-2 transition-colors"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: palette.get(slName) }}
                  />
                  <Flag iso2={iso2} className="w-4 h-3 shrink-0" />
                  <span className="font-mono text-[10px] text-ink truncate">
                    {shortName(slName)}
                  </span>
                </button>
              ))}
            </div>

            {/* Pacific avg stats */}
            <div className="mt-4 pt-3 border-t border-ink/10 grid gap-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-faint">
                Pacific avg · {year}
              </span>
              {(() => {
                const valid = rawPoints.filter(
                  (rp) => rp.ghg !== null && rp.sl !== null && rp.temp !== null
                ) as Array<{ ghg: number; sl: number; temp: number }>;
                if (!valid.length) return null;
                const n = valid.length;
                const avgG = valid.reduce((s, p) => s + p.ghg, 0) / n;
                const avgS = valid.reduce((s, p) => s + p.sl, 0) / n;
                const avgT = valid.reduce((s, p) => s + p.temp, 0) / n;
                return (
                  <>
                    <StatRow
                      label="Sea level"
                      value={`${avgS >= 0 ? "+" : ""}${avgS.toFixed(0)} mm`}
                      color="var(--lagoon)"
                    />
                    <StatRow
                      label="GHG/cap"
                      value={`${avgG.toFixed(2)} t`}
                      color="var(--gold)"
                    />
                    <StatRow
                      label="Temp Δ"
                      value={`${avgT.toFixed(2)} °C`}
                      color="#f87171"
                    />
                  </>
                );
              })()}
            </div>
          </div>

          {/* ── Year scrubber (mobile) ── */}
          <div className="lg:hidden col-span-full">
            <YearScrubber
              years={CORRELATION_YEARS}
              year={year}
              onChange={setYear}
              speedMs={850}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function StatRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-mono text-[10px] text-ink-faint">{label}</span>
      <span
        className="font-mono text-[11px] font-semibold tabular-nums"
        style={{ color }}
      >
        {value}
      </span>
    </div>
  );
}
