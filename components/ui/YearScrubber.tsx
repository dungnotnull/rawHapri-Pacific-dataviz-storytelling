"use client";

import { useEffect, useRef, useState } from "react";

interface YearScrubberProps {
  years: number[];
  year: number;
  onChange: (year: number) => void;
  speedMs?: number;
  label?: string;
}

export default function YearScrubber({
  years,
  year,
  onChange,
  speedMs = 900,
  label,
}: YearScrubberProps) {
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const minYear = years[0];
  const maxYear = years[years.length - 1];
  const idx = years.indexOf(year);

  useEffect(() => {
    if (!playing) {
      if (timer.current) clearInterval(timer.current);
      return;
    }
    timer.current = setInterval(() => {
      const currentIdx = years.indexOf(year);
      const nextIdx = currentIdx + 1;
      if (nextIdx >= years.length) {
        setPlaying(false);
        return;
      }
      onChange(years[nextIdx]);
    }, speedMs);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, year, years, speedMs]);

  const fillPct = years.length > 1 ? (idx / (years.length - 1)) * 100 : 0;

  return (
    <div className="chart-paper rounded-lg px-4 py-3 sm:px-5 sm:py-4 flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (idx === years.length - 1) onChange(years[0]);
              setPlaying((p) => !p);
            }}
            aria-label={playing ? "Pause" : "Play"}
            className="w-10 h-10 rounded-full bg-brass-bright text-paper flex items-center justify-center shrink-0 hover:brightness-110 active:scale-95 transition"
          >
            {playing ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <rect x="2" y="1" width="4" height="12" />
                <rect x="8" y="1" width="4" height="12" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <path d="M2 1 L13 7 L2 13 Z" />
              </svg>
            )}
          </button>
          <div className="font-mono leading-tight">
            <div className="text-[10px] uppercase tracking-[0.15em] text-ink-faint">
              {label ?? "Year"}
            </div>
            <div className="text-2xl text-brass-bright tabular-nums">{year}</div>
          </div>
        </div>
        <div className="font-mono text-[11px] text-ink-faint tabular-nums">
          {minYear} — {maxYear}
        </div>
      </div>
      <input
        type="range"
        className="scrubber"
        style={{ ["--fill" as string]: `${fillPct}%` }}
        min={0}
        max={years.length - 1}
        step={1}
        value={idx}
        onChange={(e) => {
          setPlaying(false);
          onChange(years[Number(e.target.value)]);
        }}
        aria-label="Select year"
      />
      <div className="flex justify-between font-mono text-[9px] text-ink-faint px-0.5">
        {years
          .filter(
            (y, i) =>
              i === 0 ||
              i === years.length - 1 ||
              y % (years.length > 15 ? 5 : 2) === 0
          )
          .map((y) => (
            <span key={y}>{y}</span>
          ))}
      </div>
    </div>
  );
}
