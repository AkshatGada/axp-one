// 05 Agentic payments, and the doors. The agent decides to buy a placement and the payment follows
// on its own, per delivered card, inside limits the advertiser fixed in advance. One heading, a
// deck, and one figure that reads as a single line of events: a judgment resolves, the labelled
// card is delivered below an answer, a charge is accepted and joins a running total that sits
// between two ink bounds, and later the total is closed. Set on paper: the doors panel that follows
// (id="start", from ../doors) is the page's one large blue object. Notes: ./NOTES.md
import { Chapter } from "../kit";
import { PAY } from "../copy";
import Doors from "../doors/Doors";
import Figure from "./Figure";
import s from "./rule.module.css";

/** One sentence per line. */
const sentences = (line: string) => line.split(/(?<=\.)\s+/);

export default function Rule() {
  return (
    <>
      <Chapter id="payments" no={PAY.no} title={PAY.title} labelledBy="payments-h" className={s.root}>
        <div className="x-wrap">
          <header className={s.head}>
            <h2 id="payments-h" className={`x-h2 ${s.h}`}>
              {sentences(PAY.h).map((t, i) => (
                <span key={t}>{i ? " " : null}{t}</span>
              ))}
            </h2>
            <p className={`x-deck ${s.deck}`}>{PAY.deck}</p>
          </header>
          <Figure />
        </div>
      </Chapter>
      <Doors />
    </>
  );
}
