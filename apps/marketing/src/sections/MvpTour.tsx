"use client";

// Inside the MVP: one large framed capture of a real MVP page, with the four pages listed beside it.
// Choosing a page swaps the frame; the frame and each item link to that page of the MVP. Without
// JS the first page shows and every item is still a link. Below 900px: all four frames, stacked.
import { useState } from "react";
import { ActionPrimary } from "@axp/design-system/prospectus";
import { MVP_TOUR, MVP_URL } from "@/data/copy";

const T = MVP_TOUR.tiles;

function Frame({ i, eager }: { i: number; eager?: boolean }) {
  const t = T[i]!;
  return (
    <a className="mt-frame" href={t.href} target="_blank" rel="noopener noreferrer" aria-label={`${t.title}: open this page of the MVP`}>
      <span className="mt-bar">
        <span className="mt-bar-t">{t.title}</span>
        <span className="mt-bar-o">Open this page</span>
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/tour/${t.key}.webp`} alt={t.alt} width={1440} height={900} loading={eager ? "eager" : "lazy"} decoding="async" />
    </a>
  );
}

export default function MvpTour() {
  const [on, setOn] = useState(0);
  return (
    <section id="mvp" className="mt px-section" aria-labelledby="mvp-q">
      <div className="px-wrap">
        <header className="mt-head">
          <div>
            <p className="px-label">{MVP_TOUR.label}</p>
            <h2 id="mvp-q" className="px-h2 mt-h">
              {MVP_TOUR.h2}
            </h2>
          </div>
          <div className="mt-head-r">
            <p className="mt-lede">{MVP_TOUR.lede}</p>
            <ActionPrimary href={MVP_URL} external size="s">
              {MVP_TOUR.action}
            </ActionPrimary>
          </div>
        </header>
        <div className="mt-body">
          <ol className="mt-list">
            {T.map((t, i) => (
              <li key={t.key} data-on={i === on ? "" : undefined}>
                <button type="button" className="mt-pick" aria-pressed={i === on} onClick={() => setOn(i)} onMouseEnter={() => setOn(i)} onFocus={() => setOn(i)}>
                  <b>{t.title}</b>
                  <span>{t.body}</span>
                </button>
                <a className="mt-open" href={t.href} target="_blank" rel="noopener noreferrer">
                  Open in the MVP
                </a>
                <div className="mt-mobile-frame">
                  <Frame i={i} />
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-stage">
            {T.map((t, i) => (
              <div key={t.key} className="mt-slot" data-on={i === on ? "" : undefined} inert={i !== on}>
                <Frame i={i} eager={i === 0} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
