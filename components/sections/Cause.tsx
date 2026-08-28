"use client";

import { useRef, useState } from "react";
import { CauseMap } from "./CauseMap";

import { EmittersContrastBar } from "./EmittersContrastBar";
import { SourceNote } from "../ui/SourceNote";
import { ScrollReveal } from "../ui/ScrollReveal";
import { WarmingStripes } from "./WarningStripes";
import { CountryModal } from "../ui/CountryModal";
import { TimelineControl } from "../ui/TimelineControl";
import { ghgLatestYear, SEA_LEVEL_START_YEAR } from "@/lib/data";

const MIN_YEAR = 2005; // Extended range: GHG data available from 1990+
const MAX_YEAR = 2024; // Latest available year in GHG dataset

export function Cause() {
  const [contrastVisible, setContrastVisible] = useState(false);
  const contrastRef = useRef<HTMLDivElement>(null);
  const [selectedCountry, setSelectedCountry] = useState<{ name: string; code: string } | null>(null);
  const [selectedYear, setSelectedYear] = useState(MAX_YEAR);

  return (
    <section id="cause" className="relative bg-foam px-6 py-14 md:px-16">
      <div className="mx-auto max-w-6xl">
        <ScrollReveal animation="fade-down" delay={200}>
          <p className="eyebrow text-lagoon">Climate story</p>
        </ScrollReveal>
        <ScrollReveal animation="fade-up" delay={400}>
          <h2 className="font-display text-3xl sm:text-4xl text-ink max-w-3xl mt-4">
            A huge imbalance in greenhouse-gas emissions across Pacific Island countries.
          </h2>
        </ScrollReveal>
        <ScrollReveal animation="fade-up" delay={600}>
          <p className="mt-5 max-w-3xl text-ink/65 text-sm sm:text-base leading-relaxed">
            From Tuvalu to Nauru, tiny carbon footprints stand against rising temperatures and rising seas
          </p>
          <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur border border-ink/10 shadow-sm transition-transform hover:scale-[1.02]">
            <svg className="w-4 h-4 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
            <span className="text-xs font-medium text-ink/80">
              Click on any country in the bar chart to view detailed data
            </span>
          </div>
          <div className="">
            <TimelineControl
              minYear={MIN_YEAR}
              maxYear={MAX_YEAR}
              currentYear={selectedYear}
              onYearChange={setSelectedYear}
            />
          </div>
        </ScrollReveal>

        <div className="mt-6 grid gap-10 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="flex flex-col gap-3">
            <ScrollReveal animation="fade-right" delay={200}>
              <div className="relative h-[62vh] md:h-[420px] 2xl:h-[60vh] min-h-[420px] rounded-2xl border border-ink/8 bg-white/65 p-2">
                <CauseMap active selectedYear={selectedYear} />
                <div className="absolute bottom-2 left-6 right-6 z-10">
                  <WarmingStripes />
                </div>
              </div>
            </ScrollReveal>
            <SourceNote className="text-primary text-xs mt-0">
                <span>Source: Pacific Data Hub, CLIMATE_CHANGE_SEA_INDICATORS, 2016–2023.</span>
              </SourceNote>
       <ScrollReveal animation="fade-up" delay={600}>
          <p className="mt-0 max-w-2xl text-sm text-primary leading-relaxed opacity-[0.7]">
            Every circle below is a Pacific Island Country or Territory,
            plotted where it sits. Its <b>size</b> is the total greenhouse gas
            (GHG) the country emits each year. Its <b>color</b> is how much the
            local temperature has already shifted.
          </p>
        </ScrollReveal>
          </div>

          <div className="flex flex-col">
            <ScrollReveal animation="fade-left" delay={600}>
              <div ref={contrastRef}>
                <div className="mt-3" onMouseEnter={() => setContrastVisible(true)}>
                  <EmittersContrastBar
                    active={true}
                    selectedYear={selectedYear}
                    onCountryClick={(name, code) => setSelectedCountry({ name, code })}
                  />
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>

        <CountryModal
          isOpen={selectedCountry !== null}
          onClose={() => setSelectedCountry(null)}
          countryCode={selectedCountry?.code || ""}
          countryName={selectedCountry?.name || ""}
        />
      </div>
    </section>
  );
}