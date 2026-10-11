// Scene C, "The app's side": the same placement the advertiser chapter followed, seen from where
// the answer is written. One large product close-up of the fictional assistant, a slot the
// reader can change, and an answer that never moves. See NOTES.md for the design idea.
import { Scene } from "../kit";
import { PUBLISHER_SIDE } from "../copy";
import Stage from "./Stage";

export default function Publisher() {
  return (
    <Scene id="publishers" tight who={PUBLISHER_SIDE.who} question={PUBLISHER_SIDE.question} lede={PUBLISHER_SIDE.lede}>
      <Stage />
    </Scene>
  );
}
