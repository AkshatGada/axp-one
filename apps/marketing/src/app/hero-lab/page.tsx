// Hero lab index (noindex, removed from the production export by the build script).
import type { Metadata } from "next";
import s from "@/hero-lab/lab.module.css";

export const metadata: Metadata = { title: "Hero lab", robots: { index: false, follow: false } };

export default function HeroLab() {
  return (
    <main className={s.index}>
      <div className="px-wrap">
        <h1 className="px-h1">Hero lab</h1>
        <ul className={s.list}>
          <li>
            <a href="/hero-lab/a/">
              <b>A. The Exchange Wall</b>
              <span>A tilted wall of observed questions; auctions clear across it; the camera flies into the recorded one.</span>
            </a>
          </li>
          <li>
            <a href="/hero-lab/b/">
              <b>B. The Order Book</b>
              <span>Opportunities stream towards you like a market tape; it resolves into the recorded row.</span>
            </a>
          </li>
        </ul>
      </div>
    </main>
  );
}
