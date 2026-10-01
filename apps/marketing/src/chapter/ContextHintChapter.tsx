// The ContextHint chapter: the second signature moment, in ContextHint's own vermillion.
// What an advertiser's agent knows, and why it is a moat: the traction, the wall of real
// observed ads with the library numbers over it, 420,540 placements sorting into country bands,
// 983 niches into the one record an agent saw, 12 countries of live collection, three numbers
// kept apart, the moat line and the way to ContextHint. Every number from library.ts or the run.
import { ActionPrimary, ActionText, Actions, Words } from "@axp/design-system/prospectus";
import { CH_URL, CONTEXTHINT } from "@/data/copy";
import { LIBRARY } from "@/data/library";
import { EvidencePayoff } from "@/specimens/EvidenceChain";
import LibraryDive from "@/scenes/LibraryDive";
import { AdWall } from "./AdWall";
import DotBands from "./DotBands";
import { CountryChart } from "./CountryChart";
import { Funnel } from "./Funnel";

export function ContextHintChapter() {
  const c = CONTEXTHINT;
  return (
    <section id="data" className="ch" aria-labelledby="data-q">
      <div className="ch-open">
        <div className="px-wrap ch-open-grid">
          <div className="ch-open-copy">
            <p className="ch-label">{c.label}</p>
            <h2 id="data-q" className="px-h1" data-reveal="">
              <Words text={c.h2} />
            </h2>
            <p className="ch-h3">{c.h3}</p>
            <p className="px-body">{c.lede}</p>
            <div className="ch-traction" data-reveal="mask">
              <span className="px-mask">
                <span className="px-mask-in ch-traction-n">{c.traction.figure}</span>
              </span>
              <span className="ch-traction-l">{c.tractionLabel}</span>
            </div>
            <ActionText href={CH_URL} external>
              {c.textLink}
            </ActionText>
          </div>
          <div className="ch-open-wall">
            <AdWall />
            <div className="ch-wall-stats">
              {c.wallStats.map((s) => (
                <div key={s.label} className="ch-wall-stat" data-reveal="mask">
                  <span className="px-mask">
                    <span className="px-mask-in ch-wall-n">{s.value}</span>
                  </span>
                  <span className="ch-wall-l">{s.label}</span>
                </div>
              ))}
            </div>
            <p className="ch-wall-label">{c.wallLabel}</p>
          </div>
        </div>
      </div>

      <DotBands />

      <div className="px-wrap ch-dive">
        <LibraryDive />
        <EvidencePayoff />
      </div>

      <div className="px-wrap ch-pair">
        <div className="ch-countries">
          <div className="ch-countries-copy">
            <h3 className="px-h2">{c.countriesTitle}</h3>
            <p className="px-body">{c.countriesBody}</p>
          </div>
          <CountryChart />
          <p className="px-small">{c.countriesNote}</p>
        </div>
        <div className="ch-funnel">
          <Funnel />
        </div>
      </div>

      <div className="ch-moat">
        <div className="px-wrap">
          <p className="px-dxl ch-moat-line" data-reveal="">
            <Words text={c.moat} accent="ContextHint already collects it." />
          </p>
          <div className="ch-moat-foot">
            <Actions>
              <ActionPrimary href={CH_URL} external className="ch-action">
                {c.action}
              </ActionPrimary>
              <ActionText href={CH_URL} external>
                {LIBRARY.url.replace("https://", "")}
              </ActionText>
            </Actions>
            <p className="px-small ch-note">{c.context}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
