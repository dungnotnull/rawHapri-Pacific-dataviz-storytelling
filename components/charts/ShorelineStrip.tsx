"use client";

export function ShorelineStrip({ retreat }: { retreat: number }) {
  // retreat: 0 (1993, low sea level) -> 1 (present-day, high sea level)
  
  // Water height goes from 20% to 35% of the container (represents ~15cm rise over a low-lying atoll)
  const waterHeightPct = 20 + retreat * 15;

  return (
    <div className="w-full">
      <div className="relative h-24 w-full overflow-hidden rounded-sm bg-ocean/20 border border-foam/10">
        {/* Land (Island Cross Section) */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#827150] to-[#d9c9a3]"
          style={{ 
            clipPath: 'ellipse(60% 100% at 50% 100%)' 
          }} 
        />
        
        {/* Water Rising */}
        <div
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0a2831] to-[#1a6575] transition-all duration-[1200ms] ease-out opacity-90 border-t border-cyan-300/40"
          style={{ height: `${waterHeightPct}%` }}
        >
          {/* subtle wave animation could go here, but static is fine for now */}
        </div>
      </div>
      <div className="flex justify-between items-center mt-2">
        <p className="eyebrow text-foam/40">
          Illustrative cross-section
        </p>
        <p className="font-mono text-[10px] text-coral-soft transition-all duration-1000">
          {retreat === 0 ? "1993: BASELINE" : "2023: WATER LEVEL RISE"}
        </p>
      </div>
    </div>
  );
}