"use client";

import { useMemo, useState } from "react";
import * as d3 from "d3";
import { cleanWaterFull, indicatorIds, shortName } from "@/lib/data";
import Flag from "../../ui/Flag";
import IndicatorSelect from "../../ui/IndicatorSelect";
import YearRangeSelect from "../../ui/YearRangeSelect";

const THRESHOLD = 1.0; // percentage points

const CAT_COLOR: Record<string, string> = {
  improved: "var(--tide)",
  declined: "var(--coral)",
  stagnant: "var(--ink-faint)",
};

const CAT_LABEL: Record<string, string> = {
  improved: "Improved",
  declined: "Declined",
  stagnant: "No change",
};

export default function CompositionPage() {
  const [indicatorId, setIndicatorId] = useState(indicatorIds[0]);
  const indicator = cleanWaterFull[indicatorId];
  const years = indicator.years;
  const [start, setStart] = useState(years[0]);
  const [end, setEnd] = useState(years[years.length - 1]);

  const rows = useMemo(() => {
    return Object.entries(indicator.countries)
      .map(([name, c]) => {
        const v0 = c.total.find((p) => p.year === start)?.value;
        const v1 = c.total.find((p) => p.year === end)?.value;
        if (v0 === undefined || v1 === undefined) return null;
        const delta = v1 - v0;
        const goodDirection = indicator.polarity === "good" ? delta : -delta;
        const category =
          goodDirection > THRESHOLD
            ? "improved"
            : goodDirection < -THRESHOLD
            ? "declined"
            : "stagnant";
        return { name, iso2: c.iso2, v0, v1, delta, category };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  }, [indicator, start, end]);

  const counts = { improved: 0, declined: 0, stagnant: 0 } as Record<string, number>;
  rows.forEach((r) => (counts[r.category] += 1));
  const total = rows.length;

  const pieData = (["improved", "stagnant", "declined"] as const).map((k) => ({
    key: k,
    value: counts[k],
  }));

  const R = 145;
  const r0 = 80;
  const pie = d3.pie<{ key: string; value: number }>().value((d) => d.value).sort(null);
  const arc = d3.arc<d3.PieArcDatum<{ key: string; value: number }>>().innerRadius(r0).outerRadius(R);
  const arcs = pie(pieData);

  return (
    <div id="composition-section">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-6 sm:py-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-tide mb-3">
          Analysis Station &middot; Change Composition
        </p>
        <h2 className="font-display text-2xl sm:text-3xl text-ink max-w-3xl">
          How many countries improved, how many declined?
        </h2>
        <p className="mt-3 max-w-2xl text-sm sm:text-base text-ink-dim leading-relaxed">
          Compares each country's start and end values within your selected year
          range, categorizing by direction of change (±{THRESHOLD} percentage point
          threshold counts as "no change"). For "higher is worse" indicators
          (open defecation), the "improvement" direction is reversed for correct
          interpretation.
        </p>

        <div className="mt-8 flex flex-col gap-4">
          <IndicatorSelect value={indicatorId} onChange={setIndicatorId} />
          <YearRangeSelect years={years} start={start} end={end} onChangeStart={setStart} onChangeEnd={setEnd} />
        </div>

        <div className="mt-6 grid lg:grid-cols-[360px_1fr] gap-6 items-start">
          <div className="chart-paper rounded-lg p-6 flex flex-col items-center">
            <svg width={2 * R + 24} height={2 * R + 24} viewBox={`0 0 ${2 * R + 24} ${2 * R + 24}`}>
              <g transform={`translate(${R + 12},${R + 12})`}>
                {arcs.map((a) => (
                  <path
                    key={a.data.key}
                    d={arc(a) ?? ""}
                    fill={CAT_COLOR[a.data.key]}
                    opacity={0.88}
                    stroke="var(--paper-raised)"
                    strokeWidth={2.5}
                  />
                ))}
                <text textAnchor="middle" y={-6} fontSize={30} fontFamily="var(--font-mono)" fill="var(--ink)" fontWeight={700}>
                  {total}
                </text>
                <text textAnchor="middle" y={18} fontSize={11} fontFamily="var(--font-mono)" fill="var(--ink-fant)" fontWeight={500}>
                  countries
                </text>
              </g>
            </svg>
            <div className="mt-5 w-full flex flex-col gap-2.5">
              {(["improved", "stagnant", "declined"] as const).map((k) => (
                <div key={k} className="flex items-center justify-between font-mono text-[12px]">
                  <span className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full" style={{ background: CAT_COLOR[k] }} />
                    {CAT_LABEL[k]}
                  </span>
                  <span className="text-ink-dim font-medium">
                    {counts[k]} &middot; {total ? Math.round((counts[k] / total) * 100) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-5">
            {(["improved", "stagnant", "declined"] as const).map((k) => (
              <div key={k} className="chart-paper rounded-lg p-5">
                <span
                  className="font-mono text-[11px] uppercase tracking-[0.15em] block mb-4 font-medium"
                  style={{ color: CAT_COLOR[k] }}
                >
                  {CAT_LABEL[k]} ({counts[k]})
                </span>
                <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-2 custom-scroll">
                  {rows
                    .filter((r) => r.category === k)
                    .map((r) => (
                      <div key={r.name} className="flex items-center gap-2.5">
                        <Flag iso2={r.iso2} className="w-5 h-3.5 shrink-0" />
                        <span className="font-mono text-[11px] text-ink truncate flex-1 font-medium">
                          {shortName(r.name)}
                        </span>
                        <span
                          className="font-mono text-[11px] tabular-nums font-semibold"
                          style={{ color: CAT_COLOR[k] }}
                        >
                          {r.delta >= 0 ? "+" : ""}
                          {r.delta.toFixed(1)}
                        </span>
                      </div>
                    ))}
                  {counts[k] === 0 && (
                    <span className="font-mono text-[11px] text-ink-faint">— none —</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
