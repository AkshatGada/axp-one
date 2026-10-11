// Scene C, "The app's side" (V3): the same placement the advertiser chapter followed, seen from
// where the answer is written. The heading and the app are one composition; the app performs once
// when it enters view, then hands its controls to the reader. See NOTES.md for the design idea.
import { Scene } from "../kit";
import Stage from "./Stage";

export default function Publisher() {
  return (
    <Scene id="publishers" tight labelledBy="publishers-q">
      <Stage />
    </Scene>
  );
}
