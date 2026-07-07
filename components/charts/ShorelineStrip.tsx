"use client";

export function ShorelineStrip({ retreat }: { retreat: number }) {
  // retreat: 0 (1993, full width) -> 1 (present-day, eroded)
  const landWidthPct = 100 - retreat * 34;
  const inset = (100 - landWidthPct) / 2;

  return (
    <div className="w-full">
      <div className="relative h-16 w-full overflow-hidden rounded-sm bg-[#0d3038]">
        {/* water */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#12454f] to-[#0a2831]" />
        {/* land strip, shrinking from both edges */}
        <div
          className="absolute bottom-0 h-7 bg-gradient-to-b from-[#d9c9a3] to-[#c2ac7c] transition-all duration-[1200ms] ease-out"
          style={{ left: `${inset}%`, right: `${inset}%` }}
        />
        {/* waterline */}
        <div
          className="absolute h-px bg-foam/30 transition-all duration-[1200ms] ease-out"
          style={{ bottom: "28px", left: 0, right: 0 }}
        />
      </div>
      <p className="eyebrow mt-2 text-foam/40">
        Illustrative cross-section, not to scale - real shoreline geometry
        pending final data.
      </p>
    </div>
  );
}