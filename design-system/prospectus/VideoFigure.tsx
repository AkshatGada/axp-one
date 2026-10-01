"use client";

// The recorded video: poster, captions track, chapter buttons. Never autoplays.
import { useRef, useState, type CSSProperties } from "react";
import { Provenance } from "../foundation/marks";

export type Chapter = { at: number; label: string };

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function VideoFigure({
  src,
  poster,
  track,
  ratio = "16 / 9",
  chapters,
  caption,
  title,
}: {
  src: string;
  poster?: string;
  track?: string;
  ratio?: string;
  chapters: Chapter[];
  caption: string;
  title: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [current, setCurrent] = useState(-1);
  const seek = (i: number) => {
    const v = ref.current;
    if (!v) return;
    v.currentTime = chapters[i]!.at;
    void v.play().catch(() => undefined);
  };
  return (
    <div className="px-video">
      <figure className="px-figure">
        <div className="px-video-frame" style={{ "--ratio": ratio } as CSSProperties}>
          <video
            ref={ref}
            controls
            preload="none"
            playsInline
            poster={poster}
            aria-label={title}
            onTimeUpdate={(e) => {
              const t = e.currentTarget.currentTime;
              let c = -1;
              chapters.forEach((ch, i) => {
                if (t >= ch.at) c = i;
              });
              setCurrent((p) => (p === c ? p : c));
            }}
          >
            <source src={src} type="video/mp4" />
            {track ? <track kind="captions" src={track} srcLang="en" label="English" default /> : null}
          </video>
        </div>
        <figcaption className="px-figcaption">
          <span className="px-figcaption-text">{caption}</span>
          <Provenance kind="replay" />
        </figcaption>
      </figure>
      <ol className="px-chapters" aria-label="Chapters">
        {chapters.map((c, i) => (
          <li key={c.at}>
            <button type="button" onClick={() => seek(i)} aria-current={current === i ? "true" : undefined}>
              <span className="px-num">{mmss(c.at)}</span>
              <span>{c.label}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
