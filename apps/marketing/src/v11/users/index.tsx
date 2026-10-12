// The companies that use the platform: one quiet line of logos moving under the cover. Each logo
// is the company's own file, drawn without its colours. The list is doubled so the loop has no seam; the second copy is
// hidden from assistive technology. Motion off: the names wrap, still.
import { USERS } from "../copy";
import s from "./users.module.css";

export default function Users() {
  return (
    <section className={s.users} aria-label={USERS.label}>
      <div className={`x-wrap ${s.in}`}>
        <p className={s.label}>{USERS.label}</p>
        <div className={s.view}>
          <ul className={s.track}>
            {[false, true].map((copy) =>
              USERS.logos.map((l) => (
                <li key={`${l.name}${copy ? "-2" : ""}`} aria-hidden={copy || undefined} data-copy={copy ? "" : undefined}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={l.src} alt={copy ? "" : l.name} height={l.h} style={{ height: l.h }} data-tone={l.tone} loading="eager" decoding="async" />
                  {l.word ? <span aria-hidden>{l.name}</span> : null}
                </li>
              )),
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
