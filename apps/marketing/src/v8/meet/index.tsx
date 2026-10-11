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
 *  each half can carry the line it is drawn with in the specimen. */
const [judge, ...fixed] = MEET.rule.split(/(?<=\.)\s+/);

export default function Meet() {
  return (
    <>
      <Scene id="network" who={MEET.who} question={MEET.question} lede={MEET.lede} center>
        <Agreement
          rule={
            <p className={s.ruleText}>
              <span className={s.judge}><i aria-hidden />{judge}</span>{" "}
              <span className={s.fixed}><i aria-hidden />{fixed.join(" ")}</span>
            </p>
          }
          notes={
            <>
              <p className={s.later}>{RECEIPT.later}</p>
              <p className="v8-cap">{RECEIPT.limit}</p>
              {DEVNET_URL ? (
                <p className={s.proof}>
                  <a href={DEVNET_URL} target="_blank" rel="noopener noreferrer">
                    <span>{MEET.proof}</span> <Arrow width={18} />
                  </a>
                  <span className={s.proofLabel}>{MEET.proofLabel}</span>
                </p>
              ) : null}
            </>
          }
        />
      </Scene>
      <Doors />
    </>
  );
}
