// The footer: the wordmark, the scope lines and the technical evidence, kept off the main story.
import { SiteFooter } from "@axp/design-system/prospectus";
import { DEVNET_URL, FOOTER } from "@/data/copy";
import s from "./footer.module.css";

const ext = { target: "_blank", rel: "noopener noreferrer" } as const;

export default function Footer() {
  return (
    <div className={s.wrap}>
      <SiteFooter
        scope={FOOTER.scope}
        legend={false}
        aside={
          <div className={s.aside}>
            <p className={s.k}>{FOOTER.evidenceLabel}</p>
            {FOOTER.evidence.map((e) => (
              <a key={e.href} href={e.href} {...("external" in e && e.external ? ext : {})}>{e.label}</a>
            ))}
            {DEVNET_URL ? <a href={DEVNET_URL} {...ext}>{FOOTER.proof}</a> : null}
          </div>
        }
        base={<span>{FOOTER.base}</span>}
      />
    </div>
  );
}
