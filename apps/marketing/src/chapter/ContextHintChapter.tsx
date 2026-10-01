// The ContextHint chapter: the second signature moment, in ContextHint's own vermillion.
// What an advertiser's agent knows, and why it is a moat: the question and ContextHint's traction,
// a band of real observed ads with the library numbers (shown as data, no relationship implied),
// 420,540 placements sorting into country bands, 983 niches into the one record an agent saw,
// 12 countries of live collection, three numbers kept apart, the moat line and the hand-off back to
// the exchange. Every number from library.ts or the run.
import { ActionPrimary, ActionText, Actions, Words } from "@axp/design-system/prospectus";
import { CH_URL, CONTEXTHINT } from "@/data/copy";
import LibraryDive from "@/scenes/LibraryDive";
import { AdWall } from "./AdWall";
import DotBands from "./DotBands";
import { CountryChart } from "./CountryChart";
import { Funnel } from "./Funnel";

export function ContextHintChapter() {
  const c = CONTEXTHINT;
  return (
    <section id="data" className="ch" aria-labelledby="data-q">
      <div className="px-wrap ch-open">
        <div className="ch-open-copy">
          <p className="ch-label">{c.label}</p>
          <h2 id="data-q" className="px-h1" data-reveal="">
            <Words text={c.h2} />
          </h2>
          <p className="ch-h3">{c.h3}</p>
          <p className="px-body">{c.lede}</p>
          <ActionText href={CH_URL} external>
            {c.textLink}
          </ActionText>
        </div>
        <div className="ch-traction" data-reveal="mask">
          <span className="px-mask">
            <span className="px-mask-in ch-traction-n">{c.traction.figure}</span>
          </span>
          <span className="ch-traction-l">{c.tractionLabel}</span>
        </div>
      </div>

      <div className="ch-wallband">
        <div className="ch-wall-frame">
          <AdWall />
          <div className="px-wrap ch-wall-over">
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
          </div>
        </div>
        <p className="px-wrap ch-wall-label">{c.wallLabel}</p>
      </div>

      <DotBands />

      <div className="px-wrap ch-dive">
        <LibraryDive />
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
          <p className="px-h1 ch-moat-line" data-reveal="">
            <span className="ch-moat-row">
              <Words text="An auction is code." />
            </span>
            <span className="ch-moat-row">
              <Words text="A record of which ads appeared beside which questions has to be collected." start={4} />
            </span>
            <span className="ch-moat-row px-accent-row">
              <Words text="ContextHint already collects it." start={16} accent="ContextHint already collects it." />
            </span>
          </p>
          <div className="ch-moat-foot">
            <Actions>
              <ActionPrimary href={CH_URL} external className="ch-action">
                {c.action}
              </ActionPrimary>
              <ActionText href="#how">{c.handoffLink}</ActionText>
            </Actions>
            <p className="ch-handoff">{c.handoff}</p>
            <p className="px-small ch-note">{c.context}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
