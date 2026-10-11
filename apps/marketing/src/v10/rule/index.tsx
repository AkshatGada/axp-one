// 05 The rule, and the doors. The page's one full-bleed ultramarine spread.
// Part one (id="rule"): the manifesto, then one figure in which a Sponsored card exists only while
// three things hold. Part two (id="start"): two doors. Notes: ./NOTES.md
import { Chapter } from "../kit";
import { RULE } from "../copy";
import Spread from "./Spread";

export default function Rule() {
  return (
    <Chapter id="rule" no={RULE.no} title={RULE.title} bare labelledBy="rule-h">
      <Spread />
    </Chapter>
  );
}
