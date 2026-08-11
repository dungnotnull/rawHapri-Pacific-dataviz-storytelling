"use client";

import { useEffect, useRef } from "react";
import { seaLevelYears } from "@/lib/data";

export function ShorelineStrip({ retreat }: { retreat: number }) {
  const startYear = seaLevelYears[0];
  const endYear = seaLevelYears[seaLevelYears.length - 1];
  
  // retreat: 0 (low sea level) -> 1 (present-day, high sea level)
  const waterHeightPct = 20 + retreat * 20; // 25% to 45%
  
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animationFrameId: number;
    const handleScroll = () => {
      animationFrameId = requestAnimationFrame(() => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const viewportCenter = window.innerHeight / 2;
        const offset = (rect.top + rect.height / 2) - viewportCenter;
        
        // Invert the multiplier so elements sink down when scrolling down
        containerRef.current.style.setProperty('--parallax-slow', `${offset * -0.15}px`);
        containerRef.current.style.setProperty('--parallax-med', `${offset * -0.08}px`);
        containerRef.current.style.setProperty('--parallax-fast', `${offset * -0.03}px`);
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // init
    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="w-full">
      <style>{`
        @keyframes move-forever {
          0% { transform: translate3d(-90px, 0, 0); }
          100% { transform: translate3d(85px, 0, 0); }
        }
        .parallax-waves > use {
          animation: move-forever 25s cubic-bezier(0.55, 0.5, 0.45, 0.5) infinite;
        }
        .parallax-waves > use:nth-child(1) {
          animation-delay: -2s;
          animation-duration: 12s;
        }
        .parallax-waves > use:nth-child(2) {
          animation-delay: -5s;
          animation-duration: 15s;
        }
        .parallax-waves > use:nth-child(3) {
          animation-delay: -7s;
          animation-duration: 18s;
        }
        .parallax-waves > use:nth-child(4) {
          animation-delay: -1s;
          animation-duration: 22s;
        }
      `}</style>
      
      <div 
        ref={containerRef}
        className="relative h-[220px] w-full overflow-hidden rounded-xl border border-foam/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
      >
        
        {/* Dynamic Sky Background */}
        <div 
          className="absolute inset-0 transition-colors duration-[1500ms]"
          style={{
            background: retreat > 0.5 
              ? 'linear-gradient(to bottom, #1e1b4b 0%, #581c87 50%, #9f1239 100%)' // Dramatic, heating sky
              : 'linear-gradient(to bottom, #0f172a 0%, #1e293b 50%, #0369a1 100%)'  // Normal twilight
          }}
        />

        {/* Twinkling Stars */}
        <div 
          className="absolute inset-[-100px] opacity-50 mix-blend-screen"
          style={{ transform: 'translateY(var(--parallax-slow, 0px))' }}
        >
          <div className="absolute top-[20%] left-[20%] w-[2px] h-[2px] bg-white rounded-full animate-pulse" />
          <div className="absolute top-[35%] left-[65%] w-[3px] h-[3px] bg-white rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-[25%] left-[80%] w-[2px] h-[2px] bg-white rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute top-[45%] left-[30%] w-[2px] h-[2px] bg-white rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="absolute top-[22%] left-[45%] w-[1.5px] h-[1.5px] bg-white rounded-full animate-pulse" style={{ animationDelay: '1.5s' }} />
        </div>

        {/* The Setting Sun */}
        <div 
          className="absolute left-1/2 rounded-full blur-[1px] transition-colors duration-[1500ms] ease-in-out"
          style={{
            width: '64px', height: '64px',
            top: retreat > 0.5 ? '35%' : '15%',
            transform: 'translateX(-50%) translateY(var(--parallax-slow, 0px))',
            background: retreat > 0.5 
              ? 'linear-gradient(to top right, #dc2626, #f97316)' 
              : 'linear-gradient(to top right, #f59e0b, #fef08a)',
            boxShadow: retreat > 0.5 
              ? '0 0 50px #dc2626, 0 0 100px #f97316' 
              : '0 0 40px #f59e0b, 0 0 80px #fef08a'
          }}
        />

        {/* Island Silhouettes (Layered Depth) */}
        {/* Back Island (Left) */}
        <div 
          className="absolute bottom-8 left-[5%] right-[40%] h-32 bg-gradient-to-t from-[#0f172a] to-[#334155] opacity-80"
          style={{ 
            clipPath: 'ellipse(45% 100% at 50% 100%)',
            transform: 'translateY(var(--parallax-med, 0px))'
          }} 
        />
        {/* Middle Island (Right) */}
        <div 
          className="absolute bottom-6 left-[35%] right-[5%] h-26 bg-gradient-to-t from-[#0f172a] to-[#475569] opacity-90"
          style={{ 
            clipPath: 'ellipse(45% 100% at 50% 100%)',
            transform: 'translateY(var(--parallax-fast, 0px))'
          }} 
        />
        {/* Front Island (Main Sand/Land) */}
        <div 
          className="absolute bottom-0 left-[-5%] right-[-5%] h-24 bg-gradient-to-t from-[#291404] via-[#59260b] to-[#92400e]"
          style={{ clipPath: 'ellipse(55% 100% at 50% 100%)' }} 
        />
        
        {/* Water Rising Container */}
        <div
          className="absolute left-0 right-0 transition-all duration-[1500ms] ease-in-out"
          style={{ bottom: "-1px", height: `calc(${waterHeightPct}%)` }}
        >
          {/* Sun reflection on water */}
          <div 
            className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-32 transition-all duration-[1500ms] opacity-70 blur-sm"
            style={{
              background: retreat > 0.5 
                ? 'linear-gradient(to right, transparent, rgba(220,38,38,0.5), transparent)' 
                : 'linear-gradient(to right, transparent, rgba(245,158,11,0.4), transparent)'
            }}
          />

          {/* Parallax SVG Waves at the top edge */}
          <div className="absolute top-[-30px] left-0 right-0 w-full h-[32px] overflow-hidden leading-[0]">
            <svg
              className="w-full h-full block drop-shadow-lg"
              preserveAspectRatio="none"
              shapeRendering="auto"
              viewBox="0 24 150 28"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <path
                  d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z"
                  id="gentle-wave"
                />
              </defs>
              <g className="parallax-waves">
                <use href="#gentle-wave" x="48" y="0" fill="rgba(26, 101, 117, 0.4)" />
                <use href="#gentle-wave" x="48" y="3" fill="rgba(26, 101, 117, 0.6)" />
                <use href="#gentle-wave" x="48" y="5" fill="rgba(26, 101, 117, 0.8)" />
                <use href="#gentle-wave" x="48" y="7" fill="rgba(26, 101, 117, 1)" />
              </g>
            </svg>
          </div>
          
          {/* Main water body */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#04161c] to-[#1a6575]" />
        </div>
      </div>
      
      {/* Footer labels */}
      <div className="flex justify-between items-center mt-3 px-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <p className="eyebrow text-foam/50">
            Interactive Cross-section
          </p>
        </div>
        <p className="font-mono text-[11px] font-bold tracking-widest text-coral-soft transition-all duration-1000">
          {retreat === 0 ? `${startYear}: BASELINE` : `${endYear}: CRITICAL SWELL`}
        </p>
      </div>
    </div>
  );
}