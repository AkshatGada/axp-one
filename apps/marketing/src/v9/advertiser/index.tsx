// 4. The advertiser's side. One scene: what you declare (left) is wired to the questions the
// agent may join (centre), and the words you approved (right) are the card that appears there.
// The reader changes a declaration, the words or the pause switch and sees the effect travel.
// See NOTES.md.
import { ActionPrimary } from "@axp/design-system/prospectus";
import { ADVERTISER_SIDE as C } from "../copy";
import { Scene } from "../kit";
import Surface from "./Surface";

export default function Advertiser() {
  return (
    <Scene id="advertisers" who={C.who} question={C.question} lede={C.lede}>
      <Surface action={<ActionPrimary href={C.action.href}>{C.action.label}</ActionPrimary>} />
    </Scene>
  );
}
