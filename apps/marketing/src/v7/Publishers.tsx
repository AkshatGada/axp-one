// For AI apps: the three calls, then the two outcomes a turn can have.
import { PRODUCT_STORY as story } from "@/data/product.story";
import { PUBLISHERS as P, PUBLISHER_URL } from "@/data/copy";
import Chapter, { Ad, Sheet } from "./Chapter";
import s from "./story.module.css";

function Mini({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <Sheet name={name} className={s.mini}>
      <div className={s.miniBody}>
        <p className={s.bubble}>{story.question}</p>
        <div className={s.answer}><i /><i /><i /><span>The app&apos;s own answer</span></div>
        {children}
      </div>
    </Sheet>
  );
}

export default function Publishers() {
  return (
    <Chapter id="publishers" copy={P} stages={["02", "04"]} flip actions={[{ href: "/sdk/", label: P.action }, { href: PUBLISHER_URL, label: P.chat }]}>
      <Sheet name="Integration" note="Three calls" className={s.code}>
        <ol className={s.steps}>
          {P.steps.map((st) => (
            <li key={st.n}>
              <span className={s.stepN}>0{st.n}</span>
              <span className={s.stepK}>{st.k}</span>
              <code>{st.code}</code>
            </li>
          ))}
        </ol>
      </Sheet>
      <div className={s.pair}>
        <Mini name={P.filled}><Ad name={story.advertiser} text={story.creative} /></Mini>
        <Mini name={P.empty}><div className={s.empty}>{P.emptyLine}</div></Mini>
      </div>
      <p className={s.note}>{P.sdkNote}</p>
    </Chapter>
  );
}
