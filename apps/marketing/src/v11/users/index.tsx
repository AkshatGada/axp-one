// The companies that use the platform: one quiet line of names moving under the cover. The names
// are set in type (no logo files). The list is doubled so the loop has no seam; the second copy is
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
            {USERS.names.map((n) => <li key={n}>{n}</li>)}
            {USERS.names.map((n) => <li key={`${n}-2`} aria-hidden data-copy="">{n}</li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}
