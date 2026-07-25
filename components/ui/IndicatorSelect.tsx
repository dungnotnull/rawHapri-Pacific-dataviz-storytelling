"use client";

import { indicatorIds, cleanWaterFull, getIndicatorLabel } from "@/lib/data";

const POLARITY_NOTE: Record<string, string> = {
  good: "higher is better",
  bad: "higher is worse",
};

export default function IndicatorSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {indicatorIds.map((id) => {
        const ind = cleanWaterFull[id];
        const active = value === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`px-3 py-2 rounded-md text-left transition-all border cursor-pointer ${
              active
                ? "bg-brass-bright text-paper border-brass-bright shadow-md hover:shadow-lg"
                : "border-grid text-ink-dim hover:border-tide hover:text-ink hover:shadow-sm bg-paper"
            }`}
          >
            <div className="font-mono text-[11px] leading-tight">{getIndicatorLabel(ind.label)}</div>
            <div
              className={`font-mono text-[9px] uppercase tracking-wide ${
                active ? "text-paper/70" : "text-ink-faint"
              }`}
            >
              {POLARITY_NOTE[ind.polarity]}
            </div>
          </button>
        );
      })}
    </div>
  );
}
