// V3 footer: links above a hairline, one small line, then the wordmark set as large and as bold
// as the page allows. No status wording. Technical evidence stays reachable from one quiet link.
import { ADVERTISER_URL, MVP_URL, PRODUCT_VIDEO_URL, PUBLISHER_URL } from "@/data/copy";
import s from "./footer.module.css";

const COLS: { head: string; links: { label: string; href: string }[] }[] = [
  { head: "Advertisers", links: [{ label: "Advertiser dashboard", href: ADVERTISER_URL }] },
  { head: "AI apps", links: [{ label: "Integration guide", href: "/sdk/" }, { label: "Example chat", href: PUBLISHER_URL }] },
  { head: "See it", links: [{ label: "Walkthrough", href: PRODUCT_VIDEO_URL }, { label: "Technical evidence", href: MVP_URL }] },
];

export default function Footer() {
  return (
    <footer className={s.footer}>
      <div className={`px-wrap ${s.in}`}>
        <nav className={s.cols} aria-label="Footer">
          {COLS.map((c) => (
            <div key={c.head} className={s.col}>
              <p className={s.head}>{c.head}</p>
              {c.links.map((l) => (
                <a key={l.href} href={l.href}>{l.label}</a>
              ))}
            </div>
          ))}
        </nav>
        <p className={s.line}>The advertising network for the agentic internet</p>
        <p className={s.mark} aria-label="axp.one">
          <span aria-hidden>axp</span><i aria-hidden /><span aria-hidden>one</span>
        </p>
      </div>
    </footer>
  );
}
