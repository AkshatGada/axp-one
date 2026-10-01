// Hero lab shell: the real site header and motion root around one hero prototype, then a quiet
// placeholder where the existing exploded card stack would take over. Not linked, not indexed,
// removed from the production export.
import type { ReactNode } from "react";
import { SiteHeader } from "@axp/design-system/prospectus";
import MotionRoot from "@/motion/MotionRoot";
import { HEADER, MVP_URL, NAV } from "@/data/copy";
import s from "./lab.module.css";

export default function LabShell({ children, name, other }: { children: ReactNode; name: string; other: { href: string; label: string } }) {
  return (
    <>
      <MotionRoot />
      <SiteHeader links={NAV} cta={{ href: MVP_URL, label: HEADER.cta, external: true }} chip={HEADER.chip} />
      <main id="main">
        {children}
        <section className={s.after}>
          <div className="px-wrap">
            <p className={s.k}>Hero lab, {name}</p>
            <p className={s.t}>The existing exploded card stack takes over from here.</p>
            <p className={s.links}>
              <a href={other.href}>{other.label}</a>
              <a href="/hero-lab/">All prototypes</a>
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
