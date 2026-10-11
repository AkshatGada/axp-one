// The film's clock. One pure function turns scroll progress (0 to 1) into every value the picture
// needs, so any progress value is a complete, valid frame: arriving in the middle, flicking past,
// or scrolling backwards all draw the same picture for the same progress. The camera has its own
// pure function (camera.ts); both are driven by the same progress. The film is five beats and ends
// on the receipt: nothing is taken away again, so the last frame is the whole story at rest.

export const cl = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const seg = (p: number, a: number, b: number) => cl((p - a) / (b - a));
export const io = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const out = (t: number) => 1 - Math.pow(1 - t, 3);
const bell = (t: number) => 4 * t * (1 - t);

/** Where each beat begins (and the end). */
export const BEATS = [0, 0.167, 0.357, 0.595, 0.81, 1] as const;
/** The composed frame of each beat (where review stills are taken). */
export const POSES = [0.155, 0.348, 0.588, 0.8, 0.99] as const;
/** The readers, as indexes into the story's AGENTS, in the story's order: the one that fits stands
 *  nearest the conversation, so its card has a clear way across. */
export const ORDER = [0, 1, 2] as const;
/** The order in which they resolve: the two that sit out first, the fit last. */
const RANK = [2, 0, 1] as const;

export type Flags = {
  /** 0 to 4: the five beats. */
  beat: number;
  /** HarborKey's judgment has resolved to a fit. */
  fit: boolean;
  /** The receipt's two sides have latched. */
  r0: boolean;
  r1: boolean;
};

export type Frame = { vars: Record<string, number>; flags: Flags; key: string };

export function frame(p: number): Frame {
  const v: Record<string, number> = {};

  // Captions: each enters by word and leaves just as the next arrives. The last one stays.
  for (let k = 0; k < 5; k++) {
    const a = BEATS[k]!;
    const b = BEATS[k + 1]!;
    let e = k === 0 ? seg(p, 0.043, 0.088) : seg(p, a + 0.01, a + 0.06);
    if (k === 3) e = seg(p, a + 0.01, a + 0.165); // its three sentences keep time with the card
    v[`--e${k}`] = e;
    v[`--x${k}`] = k === 4 ? 0 : seg(p, b - 0.005, b + 0.01);
  }
  // The title holds the caption's place until the film starts.
  v["--xh"] = seg(p, 0.019, 0.043);

  // The five steps: each fills across its beat.
  for (let k = 0; k < 5; k++) v[`--s${k}`] = seg(p, BEATS[k]!, BEATS[k + 1]!);

  // 1. Asked: the question is typed, then sent: it becomes the first line of the conversation.
  v["--ty"] = 0.3 + 0.7 * seg(p, 0, 0.06);
  v["--sd"] = io(seg(p, 0.069, 0.14));
  v["--qb"] = seg(p, 0.088, 0.133);
  v["--tall"] = 1 - seg(p, 0.069, 0.112);

  // 2. Answered: the app's own answer writes itself.
  v["--al"] = seg(p, 0.138, 0.171);
  v["--an"] = seg(p, 0.179, 0.336);

  // 3. Judged: away from the answer, three readers each read the question and resolve. The two
  // that sit out are brief: a short read, one reason, and they go quiet. The fit takes its time.
  v["--wr"] = seg(p, 0.39, 0.45);
  ORDER.forEach((i) => {
    const d = RANK[i]!;
    const fits = i === 0;
    v[`--g${i}`] = out(seg(p, 0.371 + 0.016 * d, 0.432 + 0.016 * d));
    const r0 = 0.436 + 0.014 * d;
    const read = seg(p, r0, r0 + (fits ? 0.062 : 0.036));
    v[`--rd${i}`] = read;
    v[`--bo${i}`] = bell(read) * (fits ? 1 : 0.6);
    // The words it cares about are marked as the pass crosses them; for a fit, one reason at a time.
    const h0 = fits ? 0.51 : r0 + 0.02;
    v[`--h${i}`] = seg(p, h0, h0 + (fits ? 0.052 : 0.018));
    const v0 = fits ? 0.564 : r0 + 0.038;
    v[`--v${i}`] = seg(p, v0, v0 + 0.02);
    // Those that sit out go quiet.
    v[`--o${i}`] = fits ? 1 : 1 - 0.45 * seg(p, v0 + 0.02, v0 + 0.05);
  });

  // 4. Placed: the card comes out from under the reader that fits, crosses the gap and lands in
  // the slot below the answer. Its way is clear: it never passes over the answer or another reader.
  // It travels level and arrives without a flourish.
  const fx = io(seg(p, 0.643, 0.752));
  // The slot's outline is drawn only as the card sets out: the film never rests on an empty slot.
  v["--so"] = seg(p, 0.6, 0.636) * (1 - seg(p, 0.748, 0.776));
  v["--sg"] = seg(p, 0.667, 0.748) * (1 - seg(p, 0.752, 0.786));
  v["--co"] = seg(p, 0.61, 0.62);
  v["--emg"] = io(seg(p, 0.613, 0.655));
  v["--fx"] = fx;
  v["--fk"] = 0.55 + 0.45 * fx;
  v["--lift"] = seg(p, 0.637, 0.667) * (1 - seg(p, 0.752, 0.79));

  // 5. Recorded: a receipt is written beside the card. The film ends here.
  v["--ps"] = seg(p, 0.826, 0.85);
  v["--rc"] = out(seg(p, 0.842, 0.936));
  v["--lt"] = seg(p, 0.936, 0.962);

  let beat = 0;
  for (let k = 1; k < 5; k++) if (p >= BEATS[k]! + 0.002) beat = k;
  const flags: Flags = { beat, fit: p >= 0.569, r0: p >= 0.938, r1: p >= 0.95 };
  return { vars: v, flags, key: `${beat}${flags.fit ? 1 : 0}${flags.r0 ? 1 : 0}${flags.r1 ? 1 : 0}` };
}
