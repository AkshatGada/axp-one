// 01 The shift. Three clipped keywords in a search field open out into one whole question.
// The stage (client) is server-rendered in its still form first, so every word is in the HTML.
import { Chapter } from "../kit";
import { SHIFT_COPY } from "../copy";
import ShiftStage from "./ShiftStage";

export default function Shift() {
  return (
    <Chapter id="shift" no={SHIFT_COPY.no} title={SHIFT_COPY.title} bare labelledBy="shift-h">
      <ShiftStage />
    </Chapter>
  );
}
