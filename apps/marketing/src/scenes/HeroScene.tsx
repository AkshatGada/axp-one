"use client";

// The hero, "the Exploded Card". Load (CSS, from first paint): the H1 rises word by word, the
// real question and answer play in the host chat and the real ClearVault card lands. Scroll
// (>= 900px, motion on; the section pins for ~320vh):
//   0.00-0.16  the headline lifts away;
//   0.08-0.38  the camera pulls back: the chat travels to the centre, shrinks and lies down as a plate;
//   0.36-0.42  hand-over: the chat plate becomes the collapsed stack of six plates (same place, same size);
//   0.40-0.62  the stack explodes along the ultramarine route;
//   0.44       the line: "Behind one Sponsored card, a whole exchange.";
//   0.56-0.76  leader lines and callouts draw, each with its provenance mark;
//   0.76-0.90  one ultramarine marker travels Card to Payment (Illustrative);
//   0.90-1.00  hold, then the next section arrives.
// Below 900px, under reduced motion and without JS the same markup reads as a still sequence:
// headline, chat, the line, the exploded stack (flat list on phones).
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";
import { ActionPrimary, ActionText, Actions, Words } from "@axp/design-system/prospectus";
import { CACHED, CV, HELPFUL_EXCERPT } from "@/data/run";
import { CH_URL, HERO, MVP_URL, VIDEO_ANCHOR } from "@/data/copy";
import { HostChat } from "@/specimens/HostChat";
import { Fit } from "./Fit";
import { PlateStack, PlateStackStatic, STACK_H, STACK_W } from "./PlateStack";
import { IDENTITY, PLATE_M, css, io, lerp, mixM, mul, out, scale, seg, translate } from "@/motion/motion";
import { usePinned } from "@/motion/useReduced";

const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;
const PW = 520;
const PH = 270;
/** The collapsed stack starts this much larger than its exploded size, so the lie-down fills the frame. */
const BIG = 1.4;

type Geo = { vw: number; vh: number; k: number; cx: number; cy: number; chat: { x: number; y: number; w: number; h: number } };

export default function HeroScene() {
  const ref = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const asideRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const capRef = useRef<HTMLParagraphElement>(null);
  const pinned = usePinned();
  const geo = useRef<Geo | null>(null);
  const [s, setS] = useState({ explode: 0, callouts: 0, marker: -1, zoom: BIG });
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] });

  // Measure where the chat sits (untransformed) and how big the stack is drawn.
  useEffect(() => {
    if (!pinned) return;
    const measure = () => {
      const stage = stageRef.current;
      const chat = chatRef.current?.querySelector<HTMLElement>(".sp-chat");
      if (!stage || !chat) return;
      let x = 0;
      let y = 0;
      let n: HTMLElement | null = chat;
      while (n && n !== stage) {
        x += n.offsetLeft;
        y += n.offsetTop;
        n = n.offsetParent as HTMLElement | null;
      }
      const vw = stage.clientWidth;
      const vh = stage.clientHeight;
      const k = Math.min((vw * 0.94) / STACK_W, (vh - 96) / STACK_H);
      geo.current = { vw, vh, k, cx: vw / 2, cy: vh / 2 + 28, chat: { x, y, w: chat.offsetWidth, h: chat.offsetHeight } };
      apply(p.get());
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinned]);

  function apply(v: number) {
    const g = geo.current;
    if (!g) return;
    // Headline lifts away.
    const up = out(seg(v, 0, 0.09));
    if (copyRef.current) {
      copyRef.current.style.transform = `translate3d(0, ${-140 * up}px, 0)`;
      copyRef.current.style.opacity = String(1 - seg(v, 0, 0.07));
    }
    if (asideRef.current) asideRef.current.style.opacity = String(1 - seg(v, 0, 0.06));
    // The chat travels, shrinks and lies down as a plate.
    const chat = chatRef.current?.querySelector<HTMLElement>(".sp-chat");
    if (chat) {
      const m = io(seg(v, 0.02, 0.24));
      const tilt = io(seg(v, 0.06, 0.24));
      const tx = (g.cx - (g.chat.x + g.chat.w / 2)) * m;
      const ty = (g.cy - (g.chat.y + g.chat.h / 2)) * m;
      const sx = lerp(1, (PW * g.k * BIG) / g.chat.w, m);
      const sy = lerp(1, (PH * g.k * BIG) / g.chat.h, m);
      chat.style.transform = css(mul(translate(tx, ty), mul(mixM(IDENTITY, PLATE_M, tilt), scale(sx, sy))));
      chat.style.opacity = String(1 - seg(v, 0.24, 0.27));
    }
    // The stack takes over in the same place, then explodes.
    if (stackRef.current) stackRef.current.style.opacity = String(seg(v, 0.23, 0.26));
    if (lineRef.current) {
      const t = seg(v, 0.09, 0.17);
      lineRef.current.style.opacity = String(t);
      lineRef.current.style.transform = `translate3d(0, ${18 * (1 - out(t))}px, 0)`;
    }
    if (capRef.current) capRef.current.style.opacity = String(seg(v, 0.45, 0.55));
    const next = {
      explode: io(seg(v, 0.25, 0.46)),
      callouts: seg(v, 0.42, 0.62),
      marker: v > 0.62 ? io(seg(v, 0.62, 0.8)) : -1,
      zoom: lerp(BIG, 1, io(seg(v, 0.25, 0.46))),
    };
    setS((c) => (Math.abs(c.explode - next.explode) < 0.002 && Math.abs(c.callouts - next.callouts) < 0.002 && Math.abs(c.marker - next.marker) < 0.002 && Math.abs(c.zoom - next.zoom) < 0.002 ? c : next));
  }

  useMotionValueEvent(p, "change", (v) => {
    if (pinned) apply(v);
  });

  // Leaving pinned mode (resize below 900px): clear every inline style so the still reads cleanly.
  useEffect(() => {
    if (pinned) return;
    for (const el of [copyRef.current, asideRef.current, stackRef.current, lineRef.current, capRef.current, chatRef.current?.querySelector<HTMLElement>(".sp-chat")]) {
      if (el) {
        el.style.transform = "";
        el.style.opacity = "";
      }
    }
  }, [pinned]);

  const copy = useMemo(
    () => (
      <>
        <h1 id="hero-title" className="px-dxl">
          <Words text={HERO.h1} accent={HERO.accent} />
        </h1>
        <p className="px-lead pg-hero-lede pg-in" style={d(420)}>
          {HERO.lede}
        </p>
        <a className="pg-badge pg-in" style={d(520)} href={CH_URL} target="_blank" rel="noopener noreferrer">
          <span className="pg-badge-k">{HERO.badge}</span>
          <span className="pg-badge-line">{HERO.badgeLine}</span>
        </a>
        <div className="pg-in" style={d(620)}>
          <Actions>
            <ActionPrimary href={MVP_URL} external>
              {HERO.primary}
            </ActionPrimary>
            <ActionText href={VIDEO_ANCHOR}>{HERO.video}</ActionText>
          </Actions>
        </div>
        <p className="pg-status pg-in" style={d(760)}>
          {HERO.status}
        </p>
      </>
    ),
    [],
  );
  const chat = useMemo(() => <HostChat question={CACHED.question} answer={HELPFUL_EXCERPT} answerLabel={HERO.answerLabel} appName={HERO.appName} card={{ name: CV.name, text: CV.approvedText!, destination: CV.destination }} intro marks={false} />, []);

  const k = geo.current?.k ?? 0.7;
  return (
    <section ref={ref} id="top" className="pg-hero hs" aria-labelledby="hero-title" data-pinned={pinned ? "" : undefined}>
      <div ref={stageRef} className="hs-stage">
        <div className="px-wrap pg-hero-grid hs-grid">
          <div ref={copyRef} className="pg-hero-copy">
            {copy}
          </div>
          <div className="pg-hero-chat">
            <div ref={chatRef}>{chat}</div>
            <div ref={asideRef}>
              <p className="pg-hero-cap">{HERO.frameCaption}</p>
            </div>
          </div>
        </div>

        <div className="px-wrap hs-after">
          <div ref={lineRef} className="hs-line">
            <h2 className="px-h1 hs-line-h">{HERO.pullBack}</h2>
          </div>
          <div ref={stackRef} className="hs-stack" aria-label="Six plates behind the Sponsored card: answer, card, auction, agents, evidence, payment">
            {pinned ? (
              <div className="hs-canvas" style={{ width: STACK_W, height: STACK_H, transform: `translate(-50%, -50%) scale(${k * s.zoom})` }}>
                <PlateStack tilt={1} explode={s.explode} callouts={s.callouts} marker={s.marker} />
              </div>
            ) : (
              <>
                <div className="only-wide">
                  <Fit w={STACK_W} h={STACK_H} maxH="92vh">
                    <PlateStack tilt={1} explode={1} callouts={1} marker={1} />
                  </Fit>
                </div>
                <div className="only-narrow">
                  <PlateStackStatic />
                </div>
              </>
            )}
          </div>
          <p ref={capRef} className="px-small hs-cap">
            {HERO.stackCaption}
          </p>
        </div>
      </div>
    </section>
  );
}
