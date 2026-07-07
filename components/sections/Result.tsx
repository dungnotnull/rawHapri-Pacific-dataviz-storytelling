"use client";


import { SourceNote } from "@/components/ui/SourceNote";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { MigrationSankey } from "./MigrationSankey";
import { DisplacementArea } from "./DisplacementArea";

export function Result() {
  return (
    <section id="result" className="relative bg-ocean-mid px-6 py-28 text-foam md:px-16">
      <div className="mx-auto max-w-6xl">
        <ScrollReveal animation="fade-down" delay={200}>
          <p className="eyebrow text-coral-soft">A Pacific climate story </p>
        </ScrollReveal>
        <ScrollReveal animation="fade-up" delay={400}>
          <h2 className="prose-col mt-4 max-w-2xl font-display text-[clamp(1.9rem,4vw,3rem)] font-medium leading-[1.1]">
            When the water doesn&rsquo;t stop rising, people move.
          </h2>
        </ScrollReveal>
        <ScrollReveal animation="fade-up" delay={600}>
          <p className="prose-col mt-5 max-w-xl text-foam/75">
            Rising seas and eroding coastlines are already reshaping where
            Pacific communities can live. The figures below sketch what that
            looks like - placeholders until the team's own migration analysis
            is ready.
          </p>
        </ScrollReveal>

        <div className="mt-14 grid gap-10 lg:grid-cols-[1.35fr_0.85fr]">
          <ScrollReveal animation="fade-right" delay={200}>
            <div>
              <div className="h-[52vh] min-h-[380px] rounded-2xl border border-foam/15 bg-white/[0.05] p-2 shadow-lg">
                <MigrationSankey />
              </div>
              <SourceNote className="mt-3 text-foam/50">
                <span>Illustrative placeholder - not sourced data.</span>
                <span>
                  Structure loosely informed by the IOM Asia-Pacific Migration
                  Data Portal (ap-migrationdata.iom.int).
                </span>
              </SourceNote>
            </div>
          </ScrollReveal>

          <div className="flex flex-col justify-between gap-6">
            <ScrollReveal animation="fade-left" delay={400}>
              <div>
                <p className="eyebrow text-foam/60">
                  Illustrative disaster displacement, 2020–2025
                </p>
                <div className="mt-3 h-56 rounded-2xl border border-foam/15 bg-white/[0.05] p-3 shadow-lg">
                  <DisplacementArea />
                </div>
                <SourceNote className="mt-3">
                  <span className="text-foam/80">Placeholder series - order of magnitude only.</span>
                  <span className="text-foam/80">Pending the team's own displacement analysis.</span>
                </SourceNote>
              </div>
            </ScrollReveal>

            <ScrollReveal animation="zoom-in" delay={600}>
              <div className="rounded-xl border border-gold/40 bg-gold/[0.08] p-4 shadow-md">
                <p className="eyebrow text-gold">Placeholder data</p>
                <p className="mt-2 text-sm text-foam/80">
                  Everything on this panel is illustrative. It exists to hold
                  the page's shape until the team's migration dataset is
                  finalized - swap the JSON in <code className="stat-figure text-xs">/data/migration_placeholder.json</code>{" "}
                  and every chart above updates automatically.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}