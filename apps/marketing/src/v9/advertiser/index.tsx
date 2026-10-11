// 4. The advertiser's side. One composition: the question, then one picture in which what you
// declare (left) is wired to the questions the agent may join (centre), and the words you
// approved (right) are the card that appears there. When it enters the view it performs the story
// once, proves the idea by declaring Bitcoin and taking it back, then hands over. See NOTES.md.
import { ActionPrimary } from "@axp/design-system/prospectus";
import { ADVERTISER_SIDE as C } from "../copy";
import { Scene } from "../kit";
import Surface from "./Surface";
import s from "./advertiser.module.css";

export default function Advertiser() {
  return (
    <Scene id="advertisers" tight>
      <header className={s.opener}>
        <div className={s.openerQ}>
          <p className="v8-who">{C.who}</p>
          <h2 id="advertisers-q" className={`v8-q ${s.q}`}>{C.question}</h2>
        </div>
        <p className={`v8-lede ${s.lede}`}>{C.lede}</p>
      </header>
      <Surface action={<ActionPrimary href={C.action.href}>{C.action.label}</ActionPrimary>} />
    </Scene>
  );
}
