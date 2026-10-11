// 05 The rule, and the doors. Arrangement (a): the rule is set on paper (ink type, ultramarine for
// the judgment line and its marks), and the doors panel that follows is the page's one large blue
// object. Part one (id="rule"): the manifesto, then one figure in which three things hold the
// Sponsored card, and its receipt. Part two (id="start"): the doors. Notes: ./NOTES.md
import { Chapter } from "../kit";
import { RULE } from "../copy";
import Doors from "../doors/Doors";
import Manifesto from "./Manifesto";
import Figure from "./Figure";
import s from "./rule.module.css";

export default function Rule() {
  return (
    <>
      <Chapter id="rule" no={RULE.no} title={RULE.title} labelledBy="rule-h" className={s.rule}>
        <div className={`x-wrap ${s.body}`}>
          <Manifesto />
          <Figure />
        </div>
      </Chapter>
      <Doors />
    </>
  );
}
