// The page's one receipt (used by the film, and offered to section 05). It is minimal: one statement
// line (it confirms the insertion) and two states, each with a filled mark: an accepted charge and
// an accrual, in the story's exact words. Never a payment. No client code: it renders anywhere.
// Size it by setting font-size on it or on its parent (see receipt.module.css). A title, the
// sides' labels and a line of small print exist as props, but by default none is shown.
import { RECEIPT } from "../story";
import s from "./receipt.module.css";

export type ReceiptSide = { label: string; state: string };

export function Receipt({
  confirms = RECEIPT.confirms,
  sides = [RECEIPT.advertiser, RECEIPT.app],
  title,
  labels = false,
  small,
  className,
}: {
  /** The one statement line. */
  confirms?: string;
  /** The two states. Both are always shown as done. */
  sides?: readonly ReceiptSide[];
  /** Optional, off by default: a title, each side's label, a line of small print. */
  title?: string;
  labels?: boolean;
  small?: string;
  className?: string;
}) {
  return (
    <div className={`${s.receipt}${className ? ` ${className}` : ""}`}>
      {title ? <p className={s.title}>{title}</p> : null}
      <p className={s.confirms}>{confirms}</p>
      <ul className={s.sides}>
        {sides.map((side) => (
          <li key={side.label} className={s.side}>
            {labels ? <span className={s.label}>{side.label}</span> : null}
            <span className={s.state}>
              <i className={s.done} aria-hidden />
              {side.state}
            </span>
          </li>
        ))}
      </ul>
      {small ? <p className={s.small}>{small}</p> : null}
    </div>
  );
}

export default Receipt;
