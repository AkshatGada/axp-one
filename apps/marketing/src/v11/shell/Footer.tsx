// The footer: quiet links and the tagline above a hairline, then the wordmark, bold, edge to edge.
import { ADVERTISER_URL, CHAT_URL, FOOTER, GUIDE_URL, VIDEO_URL } from "../copy";
import { MVP_URL } from "@/data/copy";
import s from "./shell.module.css";

const COLS = [
  { head: "Advertisers", links: [{ label: "Advertiser dashboard", href: ADVERTISER_URL }] },
  { head: "AI apps", links: [{ label: "Integration guide", href: GUIDE_URL }, { label: "Example chat", href: CHAT_URL }] },
  { head: "See it", links: [{ label: "Walkthrough", href: VIDEO_URL }, { label: "Technical evidence", href: MVP_URL }] },
];

export default function Footer() {
  return (
    <footer className={s.foot}>
      <div className={`x-wrap ${s.footIn}`}>
        <div className={s.footTop} data-rise="">
          <p className={s.footLine}>{FOOTER.line}</p>
          <nav className={s.cols} aria-label="Footer">
            {COLS.map((c) => (
              <div key={c.head} className={s.col}>
                <p>{c.head}</p>
                {c.links.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}
              </div>
            ))}
          </nav>
        </div>
        <p className={s.footMark} aria-label="axp.one" data-rise="mark"><span aria-hidden>axp</span><i aria-hidden /><span aria-hidden>one</span></p>
      </div>
    </footer>
  );
}
