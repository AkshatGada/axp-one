// The film's clock. One pure function turns scroll progress (0 to 1) into every value the picture
// needs, so any progress value is a complete, valid frame: arriving in the middle, flicking past,
// or scrolling backwards all draw the same picture for the same progress. The camera has its own
// pure function (camera.ts); both are driven by the same progress. The film is four beats and ends
// on the placed card: nothing is taken away again, so the last frame is the whole story at rest.
// In beats 3 to 5 the camera settles first and the object arrives after, inside the frame.

export const cl = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const seg = (p: number, a: number, b: number) => cl((p - a) / (b - a));
export const io = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const out = (t: number) => 1 - Math.pow(1 - t, 3);
const bell = (t: number) => 4 * t * (1 - t);

/** Where each beat begins (and the end). */
export const BEATS = [0, 0.167, 0.357, 0.595, 0.795] as const;
/** The film ends on the placed card: scroll progress 0 to 1 plays the clock from 0 to END. */
export const END = 0.795;
/** The composed frame of each beat (where review stills are taken). */
export const POSES = [0.155, 0.348, 0.588, 0.79] as const;

export type Frame = { vars: Record<string, number>; beat: number };

export function frame(progress: number): Frame {
  const p = cl(progress) * END;
  const v: Record<string, number> = {};

  // Captions: each enters by word and leaves just as the next arrives. The last one stays.
  for (let k = 0; k < 4; k++) {
    const a = BEATS[k]!;
    const b = BEATS[k + 1]!;
    let e = k === 0 ? seg(p, 0.043, 0.088) : seg(p, a + 0.01, a + 0.06);
    if (k === 3) e = seg(p, a + 0.01, a + 0.15); // its three sentences keep time with the card
    v[`--e${k}`] = e;
    v[`--x${k}`] = k === 3 ? 0 : seg(p, b - 0.005, b + 0.01);
  }
  // The title holds the caption's place until the film starts.
  v["--xh"] = seg(p, 0.019, 0.043);

  // The four steps: each fills across its beat.
  for (let k = 0; k < 4; k++) v[`--s${k}`] = seg(p, BEATS[k]!, BEATS[k + 1]!);

  // 1. Asked: the question is typed, then sent: it becomes the first line of the conversation.
  v["--ty"] = 0.3 + 0.7 * seg(p, 0, 0.06);
  v["--sd"] = io(seg(p, 0.069, 0.14));
  v["--qb"] = seg(p, 0.088, 0.133);
  v["--tall"] = 1 - seg(p, 0.069, 0.112);

  // 2. Answered: the app's own answer writes itself.
  v["--al"] = seg(p, 0.138, 0.171);
  v["--an"] = seg(p, 0.179, 0.336);

  // 3. Judged: beside the conversation, the agent that fits reads the question. Its sheet arrives
  // whole (name, question, reasons); a pass of light crosses the question, the three phrases its
  // judgment rests on light one at a time with their reasons, and its mark turns on: Fits. The
  // others are one quiet line under it.
  v["--wr"] = seg(p, 0.385, 0.43);
  v["--g"] = out(seg(p, 0.395, 0.445));
  const read = seg(p, 0.452, 0.53);
  v["--rd"] = read;
  v["--bo"] = bell(read);
  v["--h"] = seg(p, 0.468, 0.552);
  v["--v"] = seg(p, 0.552, 0.576);
  v["--ot"] = seg(p, 0.566, 0.592);

  // 4. Placed: the camera settles on the place below the answer; then the card comes up into it,
  // at its own size, inside the frame. It never moves over the answer.
  v["--co"] = seg(p, 0.682, 0.722);
  v["--cr"] = out(seg(p, 0.682, 0.742));

  let beat = 0;
  for (let k = 1; k < 4; k++) if (p >= BEATS[k]! + 0.002) beat = k;
  return { vars: v, beat };
}
