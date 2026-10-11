// V2 footer: the wordmark and nothing that reads as status. Technical evidence stays off the
// main story; one quiet link keeps it reachable.
import { Wordmark } from "@axp/design-system/prospectus";
import { MVP_URL } from "@/data/copy";
import s from "./shell.module.css";

export default function Footer() {
  return (
    <footer className={s.footer}>
      <div className={`px-wrap ${s.footerIn}`}>
        <Wordmark as="p" className={s.mark} />
        <div className={s.base}>
          <span>The advertising network for the agentic internet.</span>
          <a href={MVP_URL}>Technical evidence</a>
        </div>
      </div>
    </footer>
  );
}
