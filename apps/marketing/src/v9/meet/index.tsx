// D. Where they meet, then two doors. Three things agree, one card exists, one receipt with two
// sides is written, and the two sides become the two doors. See NOTES.md for the idea.
import { Arrow } from "@axp/design-system/prospectus";
import { DEVNET_URL } from "@/data/copy";
import { RECEIPT } from "../story";
import { MEET } from "../copy";
import { Scene } from "../kit";
import Agreement from "./Agreement";
import Doors from "./Doors";
import s from "./meet.module.css";

/** "Agents judge fit." and "Fixed rules decide money.", kept as the frozen sentence, split so
 *  each half can sit where it applies: one beside the judgment, one beside the money. */
const [judge, ...fixed] = MEET.rule.split(/(?<=\.)\s+/);

export default function Meet() {
  return (
    <>
      <Scene id="network" tight labelledBy="network-q" className={s.net}>
        <header className={s.opener}>
          <div className={s.openerQ}>
            <p className="v8-who">{MEET.who}</p>
            <h2 id="network-q" className={`v8-q ${s.q}`}>{MEET.question}</h2>
          </div>
          <p className={`v8-lede ${s.lede}`}>{MEET.lede}</p>
        </header>
        <Agreement
          judge={<><i aria-hidden />{judge}</>}
          fixed={<><i aria-hidden />{fixed.join(" ")}</>}
          foot={
            <>
              <p className={s.small}>{RECEIPT.later} {RECEIPT.limit}</p>
              {DEVNET_URL ? (
                <a className={s.proof} href={DEVNET_URL} target="_blank" rel="noopener noreferrer">
                  <span className={s.proofText}>
                    <b>{MEET.proof}</b> <span className={s.proofLabel}>{MEET.proofLabel}</span>
                  </span>
                  <Arrow width={18} />
                </a>
              ) : null}
            </>
          }
        />
      </Scene>
      <Doors />
    </>
  );
}
