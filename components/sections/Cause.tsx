"use client";

import { useRef, useState } from "react";
import { CauseMap } from "./CauseMap";

import { EmittersContrastBar } from "./EmittersContrastBar";
import { SourceNote } from "../ui/SourceNote";
import { ScrollReveal } from "../ui/ScrollReveal";
import { WarmingStripes } from "./WarningStripes";
import { CountryModal } from "../ui/CountryModal";
import { YearControl } from "../ui/YearControl";

const MIN_YEAR = 1970; // GHG data starts from 1970
const MAX_YEAR = 2024; // Latest available year in data

export function Cause() {
  const [contrastVisible, setContrastVisible] = useState(false);
  const contrastRef = useRef<HTMLDivElement>(null);
  const [selectedCountry, setSelectedCountry] = useState<{ name: string; code: string } | null>(null);
  const [selectedYear, setSelectedYear] = useState(MAX_YEAR);

  return (
    <section id="cause" className="relative bg-foam px-6 py-28 md:px-16">
      <div className="mx-auto max-w-6xl">
        <ScrollReveal animation="fade-down" delay={200}>
          <p className="eyebrow text-lagoon">A Pacific climate story </p>
        </ScrollReveal>
        <ScrollReveal animation="fade-up" delay={400}>
          <h2 className="prose-col mt-4 max-w-2xl font-display text-[clamp(1.9rem,4vw,3rem)] font-medium leading-[1.1] text-ink">
            One island exhales a whisper of carbon. A handful of nations roar.
          </h2>
        </ScrollReveal>
        <ScrollReveal animation="fade-up" delay={600}>
          <p className="prose-col mt-5 max-w-xl text-ink/65">
            Every circle below is a Pacific Island Country or Territory,
            plotted where it sits. Its <b>size</b> is how much CO₂ the average
            person there emits each year. Its <b>color</b> is how much the
            local temperature has already shifted.
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

        <div className="mt-14 grid gap-10 lg:grid-cols-[1.3fr_0.9fr]">
          <ScrollReveal animation="fade-right" delay={200}>
            <div className="h-[62vh] min-h-[420px] rounded-2xl border border-ink/8 bg-white/40 p-2">
              <CauseMap active selectedYear={selectedYear} />
            </div>
          </ScrollReveal>

          <div className="flex flex-col justify-between gap-10">
            <ScrollReveal animation="fade-left" delay={400}>
              <div>
                <p className="eyebrow text-ink/50">Regional warming, 1850–2025</p>
                <div className="mt-3">
                  <WarmingStripes />
                </div>
                <SourceNote className="mt-3">
                  <span>Source: Pacific Data Hub, CLIMATE_CHANGE_TEMP_INDICATORS.</span>
                  <span>Unweighted average across 22 PICTs, °C vs. baseline.</span>
                </SourceNote>
              </div>
            </ScrollReveal>

            <ScrollReveal animation="fade-left" delay={600}>
              <div ref={contrastRef}>
                <p className="eyebrow text-ink/50">For scale: per-capita CO₂, 2023–24</p>
                <div className="mt-3" onMouseEnter={() => setContrastVisible(true)}>
                  <EmittersContrastBar
                    active={true}
                    selectedYear={selectedYear}
                    onCountryClick={(name, code) => setSelectedCountry({ name, code })}
                  />
                </div>
                <SourceNote className="mt-3">
                  <span>Pacific figure: Pacific Data Hub, CLIMATE_CHANGE_GHG_INDICATORS (avg. of 15 PICTs, excl. outliers).</span>
                  <span>Other countries: Global Carbon Project / Our World in Data, 2023 (approx., for context only).</span>
                </SourceNote>
              </div>
            </ScrollReveal>
          </div>
        </div>

        <ScrollReveal animation="fade-up" delay={800}>
          <p className="prose-col mt-10 max-w-2xl text-sm text-ink/50">
            * Palau and New Caledonia report unusually high per-capita figures -
            Palau's from its large international ship registry, New
            Caledonia's from nickel processing - not from everyday household
            emissions. Both are marked with a dashed ring on the map.
          </p>
        </ScrollReveal>

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