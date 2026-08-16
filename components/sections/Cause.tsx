"use client";

import { useRef, useState } from "react";
import { CauseMap } from "./CauseMap";

import { EmittersContrastBar } from "./EmittersContrastBar";
import { SourceNote } from "../ui/SourceNote";
import { ScrollReveal } from "../ui/ScrollReveal";
import { WarmingStripes } from "./WarningStripes";
import { CountryModal } from "../ui/CountryModal";
import { YearControl } from "../ui/YearControl";
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
          <p className="eyebrow text-lagoon">A Pacific climate story</p>
        </ScrollReveal>
        <ScrollReveal animation="fade-up" delay={400}>
          <h2 className="font-display text-3xl sm:text-4xl text-ink max-w-3xl mt-4">
            One island exhales a whisper of carbon. A handful of nations roar.
          </h2>
        </ScrollReveal>
        <ScrollReveal animation="fade-up" delay={600}>
          <p className="prose-col mt-5 max-w-xl text-ink/65">
            xxxxxxxxxxxxx
          </p>
          <p className="max-w-2xl text-sm text-red-500 leading-relaxed italic">
          Click on any country in the chart to view detailed data 
        </p>
          <div className="mt-4">
            <YearControl
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
              <div className="relative h-[62vh] md:h-[420px] 2xl:h-[60vh] min-h-[420px] rounded-2xl border border-ink/8 bg-white/40 p-2">
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