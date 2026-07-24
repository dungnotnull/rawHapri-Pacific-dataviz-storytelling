import { TideRail } from "@/components/ui/TideRail";
import { Hero } from "@/components/sections/Hero";
import { Cause } from "@/components/sections/Cause";
import { Result } from "@/components/sections/Result";
import Part1Chart1 from "@/components/sections/part1/Chart1";
import Part1Chart2 from "@/components/sections/part1/Chart2";
import Part2Chart1 from "@/components/sections/part2/Chart1";
import Part2Chart2 from "@/components/sections/part2/Chart2";
import { BackToTop } from "@/components/ui/BackToTop";

const MARKS = [
  { id: "closing", label: "closing" },
  { id: "result", label: "result" },
  { id: "cause", label: "cause" },
  { id: "intro", label: "intro" },
];

export default function Home() {
  return (
    <main className="relative">
      <TideRail marks={MARKS} />
      <BackToTop />

      <div className="fixed right-6 top-6 z-40 hidden md:block">
        <p className="eyebrow rounded-full border border-ink/10 bg-foam/80 px-3 py-1.5 text-ink/60 backdrop-blur">
          Tides of Debt
        </p>
      </div>

      <Hero />
      <Cause />
      <Result />
      <Part1Chart1 />
      <Part1Chart2 />
      <Part2Chart1 />
      <Part2Chart2 />

      <footer
        id="closing"
        className="border-t border-foam/10 bg-ocean-deep px-6 py-16 text-foam md:px-16"
      >
        <div className="mx-auto max-w-6xl">
          <p className="prose-col max-w-xl font-display text-xl italic leading-snug text-foam/85">
            Pacific islands have added almost nothing to the carbon ledger - yet
            they are the ones paying down its interest, one rising tide at a
            time.
          </p>

          <div className="mt-12 grid gap-8 border-t border-foam/10 pt-8 text-sm text-foam/50 md:grid-cols-3">
            <div>
              <p className="eyebrow text-foam/70">Team info</p>
              <p className="mt-2 leading-relaxed">
                Hong Ngoc, Minh Thu, Hoang Lan, Hoang Dung
              </p>
            </div>
            <div>
              <p className="eyebrow text-foam/70">Data</p>
              <p className="mt-2 leading-relaxed">
                Pacific Data Hub (sea level, GHG, temperature). Migration
                figures are illustrative placeholders - see{" "}
                <code className="stat-figure text-xs">/data/SOURCES.md</code>{" "}
                for the full source list and caveats.
              </p>
            </div>
            <div>
              <p className="eyebrow text-foam/70">Entry for</p>
              <p className="mt-2 leading-relaxed">
                Pacific Dataviz Challenge, interactive category.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
