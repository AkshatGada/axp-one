// axp.one: the landing page, v6. The story of what happens in the MVP, on three pillars:
// hero, pillars, how it works (the dark stage), ContextHint, Jev, Solana, inside the MVP, proof,
// closing. Every word is server-rendered and visible without JS; motion layers on top (scenes/).
// Run values come from src/data/run.landing.json (the slim, render-only slice of the extraction);
// all copy from src/data/copy.ts. No internal identifiers and no exact library counts on this page:
// those live in the MVP and on contexthint.com.
import { ActionPrimary, ActionText, Actions, SiteFooter, SiteHeader, VideoFigure, Words, Wrap } from "@axp/design-system/prospectus";
import MotionRoot from "@/motion/MotionRoot";
import FilmMode from "@/motion/FilmMode";
import { RUN } from "@/data/run";
import { CH_URL, CLOSING, DEVNET_URL, FOOTER, HEADER, MVP_URL, MVP_VERIFY_URL, NAV, PROOF, REAL, VIDEO, VIDEO_ANCHOR } from "@/data/copy";
import HeroScene from "@/scenes/HeroScene";
import StageScene from "@/scenes/StageScene";
import ClosingStack from "@/scenes/ClosingStack";
import { ContextHintSection, JevSection, Pillars, SolanaSection } from "@/sections/Sections";
import MvpTour from "@/sections/MvpTour";

const ext = { target: "_blank", rel: "noopener noreferrer" } as const;

function Video() {
  const v = RUN.video;
  if (!v) return null;
  return (
    <div id="video" className="pr-video">
      <VideoFigure src={`/${v.file}`} poster="/video-poster.png" track={`/${v.captions}`} ratio={`${v.width} / ${v.height}`} title={VIDEO.title} caption={VIDEO.caption} chapters={v.chapters.map((at, i) => ({ at, label: VIDEO.chapters[i]! }))} />
    </div>
  );
}

function Proof() {
  return (
    <section id="proof" className="pr px-section" aria-labelledby="proof-q">
      <Wrap>
        <div className="pr-top">
          <div className="pr-copy">
            <p className="px-label">{PROOF.label}</p>
            <h2 id="proof-q" className="px-h2" data-reveal="">
              <Words text={PROOF.h2} />
            </h2>
            <p className="pr-counts">{PROOF.counts}</p>
            <p className="pr-money">{PROOF.money}</p>
            <ul className="pr-links">
              <li>
                <a href={MVP_VERIFY_URL} {...ext}>
                  {PROOF.verifyLine}
                </a>
              </li>
              {DEVNET_URL ? (
                <li>
                  <a href={DEVNET_URL} {...ext}>
                    {PROOF.devnet}
                  </a>
                </li>
              ) : null}
            </ul>
            <Actions>
              <ActionPrimary href={MVP_URL} external size="s">
                {PROOF.action}
              </ActionPrimary>
            </Actions>
          </div>
          <Video />
        </div>
        <div className="real" id="whats-real">
          <p className="real-h">{REAL.title}</p>
          <div className="real-grid">
            {[REAL.real, REAL.illustrative, REAL.notShown].map((col, i) => (
              <div key={col.title} className="real-col" data-kind={["real", "ill", "not"][i]}>
                <p className="real-k">{col.title}</p>
                <ul>
                  {col.items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </Wrap>
    </section>
  );
}

function Closing() {
  return (
    <section className="pg-close px-section" data-tone="brand" data-header-tone="brand" aria-labelledby="close-q">
      <Wrap>
        <div className="pg-close-grid">
          <div className="pg-close-copy">
            <p className="pg-slogan">{CLOSING.slogan}</p>
            <h2 id="close-q" className="px-dxl" data-reveal="">
              <Words text={CLOSING.h2} />
            </h2>
            <p className="px-lead">{CLOSING.body}</p>
            <Actions>
              <ActionPrimary href={MVP_URL} external>
                {CLOSING.primary}
              </ActionPrimary>
              <ActionText href={VIDEO_ANCHOR}>{CLOSING.video}</ActionText>
              <ActionText href={CH_URL} external>
                {CLOSING.contexthint}
              </ActionText>
            </Actions>
          </div>
          <ClosingStack />
        </div>
      </Wrap>
    </section>
  );
}

function FooterAside() {
  return (
    <div className="ft-aside">
      <div>
        <p className="ft-k">{FOOTER.contexthint.title}</p>
        <p>{FOOTER.contexthint.body}</p>
        <a href={CH_URL} {...ext}>
          {FOOTER.contexthint.link}
        </a>
      </div>
      <div>
        <p className="ft-k">Credits</p>
        <p>
          {FOOTER.jev.text}{" "}
          <a href={FOOTER.jev.url} {...ext}>
            {FOOTER.jev.name}
          </a>
          . Settlement on{" "}
          <a href="https://solana.com" {...ext}>
            Solana
          </a>
          .
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <MotionRoot />
      <FilmMode />
      <SiteHeader links={NAV} cta={{ href: MVP_URL, label: HEADER.cta, external: true }} chip={HEADER.chip} />
      <main id="main" className="pg-main">
        <HeroScene />
        <Pillars />
        <StageScene />
        <ContextHintSection />
        <JevSection />
        <SolanaSection />
        <MvpTour />
        <Proof />
        <Closing />
      </main>
      <SiteFooter scope={FOOTER.scope} legend={false} aside={<FooterAside />} base={<span>{FOOTER.base}</span>} />
    </>
  );
}
