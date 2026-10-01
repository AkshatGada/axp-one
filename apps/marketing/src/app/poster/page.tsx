// A designed frame used as the video poster (rendered once to public/video-poster.png by a headless
// capture). noindex; not linked from the page.
import type { Metadata } from "next";
import { Wordmark } from "@axp/design-system/prospectus";
import { CACHED, CV, HELPFUL_EXCERPT } from "@/data/run";
import { HERO, PROOF, VIDEO } from "@/data/copy";
import { HostChat } from "@/specimens/HostChat";

export const metadata: Metadata = { title: "Poster", robots: { index: false, follow: false } };

export default function Poster() {
  return (
    <main className="poster">
      <div className="poster-top">
        <Wordmark className="poster-mark" />
        <span className="poster-k">{PROOF.video}</span>
      </div>
      <h1 className="poster-h">{PROOF.video}.</h1>
      <p className="poster-sub">{VIDEO.caption}</p>
      <div className="poster-chat">
        <HostChat question={CACHED.question} answer={HELPFUL_EXCERPT} answerLabel={HERO.answerLabel} appName={HERO.appName} card={{ name: CV.name, text: CV.approvedText!, destination: CV.destination }} />
      </div>
    </main>
  );
}
