// Where it stands: what works in the test workspace, and directions that are not offered yet.
import { STATUS as S } from "@/data/copy";
import Chapter, { Sheet } from "./Chapter";
import s from "./story.module.css";

export default function Status() {
  return (
    <Chapter id="status" copy={{ label: S.label, h2: S.h2 }} flip last>
      <div className={s.status}>
        <Sheet name={S.nowLabel} className={s.list}><ul>{S.now.map((x) => <li key={x}>{x}</li>)}</ul></Sheet>
        <Sheet name={S.nextLabel} className={s.list} data-next=""><ul>{S.next.map((x) => <li key={x}>{x}</li>)}</ul></Sheet>
      </div>
    </Chapter>
  );
}
