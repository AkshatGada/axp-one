// The film's clock. One pure function turns scroll progress (0 to 1) into every value the picture
// needs, so any progress value is a complete, valid frame: arriving in the middle, flicking past,
// or scrolling backwards all draw the same picture for the same progress. The camera has its own
// pure function (camera.ts); both are driven by the same progress.

export const cl = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const seg = (p: number, a: number, b: number) => cl((p - a) / (b - a));
export const io = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const out = (t: number) => 1 - Math.pow(1 - t, 3);
const bell = (t: number) => 4 * t * (1 - t);

/** Where each beat begins (and the coda, and the end). */
export const BEATS = [0, 0.14, 0.3, 0.5, 0.68, 0.84, 1] as const;
/** The composed frame of each beat: where a step button lands, and where the stills are taken. */
export const POSES = [0.13, 0.292, 0.494, 0.672, 0.832, 0.994] as const;
/** The readers, as indexes into the story's AGENTS, in the story's order: the one that fits stands
 *  nearest the conversation, so its card has a clear way across. */
export const ORDER = [0, 1, 2] as const;
/** The order in which they resolve: the two that sit out first, the fit last. */
const RANK = [2, 0, 1] as const;

export type Flags = {
  /** 0 to 4: the five beats. 5: the coda. */
  beat: number;
  /** The step that is being played right now (in the coda the first three replay). -1: none. */
  now: number;
  /** HarborKey's judgment has resolved to a fit. */
  fit: boolean;
  /** The receipt's two sides have latched. */
  r0: boolean;
  r1: boolean;
};

export type Frame = { vars: Record<string, number>; flags: Flags; key: string };

export function frame(p: number, compact: boolean): Frame {
  const v: Record<string, number> = {};
  const coda = p >= BEATS[5];

  // Captions: each enters by word and leaves just as the next arrives.
  for (let k = 0; k < 6; k++) {
    const a = BEATS[k];
    const b = BEATS[k + 1];
    let e = k === 0 ? seg(p, 0.036, 0.074) : seg(p, a + 0.008, a + 0.05);
    if (k === 3) e = seg(p, a + 0.008, a + 0.142); // its three sentences keep time with the card
    v[`--e${k}`] = e;
    v[`--x${k}`] = k === 5 ? 0 : seg(p, b - 0.004, b + 0.008);
  }
  // The title holds the caption's place until the film starts.
  v["--xh"] = seg(p, 0.016, 0.036);

  // The five steps: each fills across its beat. In the coda they clear, and only three replay.
  const clear = 1 - seg(p, 0.84, 0.862);
  const replay = compact
    ? [seg(p, 0.862, 0.885), seg(p, 0.885, 0.905), seg(p, 0.87, 0.925)]
    : [seg(p, 0.862, 0.89), seg(p, 0.925, 0.968), seg(p, 0.872, 0.925)];
  for (let k = 0; k < 5; k++) {
    v[`--s${k}`] = seg(p, BEATS[k], BEATS[k + 1]) * clear + (coda && k < 3 ? replay[k]! : 0);
  }

  // 1. Asked: the question is typed, then sent: it becomes the first line of the conversation.
  v["--ty"] = 0.3 + 0.7 * seg(p, 0, 0.05);
  v["--sd"] = io(seg(p, 0.058, 0.118));
  v["--qb"] = seg(p, 0.074, 0.112);
  v["--tall"] = 1 - seg(p, 0.058, 0.094);

  // 2. Answered: the app's own answer writes itself.
  v["--al"] = seg(p, 0.116, 0.144);
  v["--an"] = seg(p, 0.15, 0.284);

  // 3. Judged: away from the answer, three readers each read the question and resolve.
  // The coda: they read the other question, and every one sits out.
  const leave = 1 - seg(p, 0.84, 0.862);
  const c0 = compact ? 0.866 : 0.872;
  const cs = compact ? 0.6 : 0.72;
  v["--wr"] = seg(p, 0.33, 0.385);
  ORDER.forEach((i) => {
    const d = RANK[i]!;
    const fits = i === 0;
    v[`--g${i}`] = out(seg(p, 0.312 + 0.016 * d, 0.368 + 0.016 * d));
    const r0 = 0.372 + 0.014 * d;
    const read1 = seg(p, r0, r0 + (fits ? 0.05 : 0.04));
    const read2 = seg(p, c0 + 0.006 * d * cs, c0 + (0.03 + 0.006 * d) * cs);
    const read = coda ? read2 : read1;
    v[`--rd${i}`] = read;
    v[`--bo${i}`] = bell(read);
    // The words it cares about light as the pass crosses them; for a fit, one reason at a time.
    const h0 = fits ? 0.43 : r0 + 0.026;
    v[`--h${i}`] = seg(p, h0, h0 + (fits ? 0.042 : 0.018)) * leave;
    const v0 = fits ? 0.474 : r0 + 0.046;
    const v1 = seg(p, v0, v0 + 0.018) * leave;
    const v2 = seg(p, c0 + (0.032 + 0.01 * d) * cs, c0 + (0.048 + 0.01 * d) * cs);
    v[`--v${i}`] = v1;
    v[`--w${i}`] = v2;
    // Those that sit out go quiet.
    v[`--o${i}`] = fits ? 1 - 0.14 * v2 : 1 - Math.max(0.42 * seg(p, v0 + 0.02, v0 + 0.05) * leave, 0.14 * v2);
  });
  v["--c2"] = seg(p, 0.846, 0.872);

  // 4. Placed: the card comes out from under the reader that fits, crosses the gap and lands in
  // the slot below the answer. Its way is clear: it never passes over the answer or another reader.
  const fx = io(seg(p, 0.54, 0.63));
  // In a tall frame the slot is in view from the second beat, so it is drawn from then on.
  v["--so"] = (compact ? seg(p, 0.15, 0.2) : seg(p, 0.5, 0.53)) * (1 - seg(p, 0.628, 0.65));
  v["--sg"] = seg(p, 0.56, 0.628) * (1 - seg(p, 0.63, 0.656));
  v["--co"] = seg(p, 0.512, 0.52);
  v["--emg"] = io(seg(p, 0.515, 0.55));
  v["--fx"] = fx;
  v["--fk"] = 0.55 + 0.45 * fx;
  v["--tilt"] = Math.sin(Math.PI * fx) * (1 - fx * 0.4);
  v["--bump"] = bell(seg(p, 0.63, 0.656)); // it presses into the slot and settles
  v["--lift"] = seg(p, 0.535, 0.56) * (1 - seg(p, 0.632, 0.662));
  const ring = seg(p, 0.634, 0.668);
  v["--rg"] = ring;
  v["--rgo"] = bell(ring);

  // 5. Recorded: a receipt is printed beside the card.
  v["--ps"] = seg(p, 0.7, 0.722) * (1 - seg(p, 0.84, 0.86));
  v["--rc"] = out(seg(p, 0.716, 0.802));
  v["--rx"] = seg(p, 0.84, 0.864);
  v["--lt"] = seg(p, 0.802, 0.826);

  // Coda: another question. It is answered; nothing fits; the slot stays empty; no receipt.
  v["--t1"] = io(seg(p, 0.84, 0.874));
  v["--q2"] = out(seg(p, 0.86, 0.896));
  v["--al2"] = seg(p, 0.888, 0.9);
  // Wide and narrow frames both look at the readers first, then at the conversation.
  v["--an2"] = compact ? seg(p, 0.896, 0.925) : seg(p, 0.925, 0.968);
  v["--so2"] = compact ? seg(p, 0.954, 0.984) : seg(p, 0.962, 0.984);
  v["--nr"] = compact ? seg(p, 0.906, 0.924) : seg(p, 0.972, 0.994);

  let beat = 0;
  for (let k = 1; k < 6; k++) if (p >= BEATS[k]! + 0.002) beat = k;
  let now = beat;
  if (beat === 5) now = replay[2]! > 0 && replay[2]! < 1 ? 2 : replay[1]! > 0 && replay[1]! < 1 ? 1 : replay[0]! > 0 && replay[0]! < 1 ? 0 : -1;
  const flags: Flags = {
    beat,
    now,
    fit: p >= 0.478 && p < 0.846,
    r0: p >= 0.804 && p < 0.846,
    r1: p >= 0.816 && p < 0.846,
  };
  return { vars: v, flags, key: `${beat}${now}${flags.fit ? 1 : 0}${flags.r0 ? 1 : 0}${flags.r1 ? 1 : 0}` };
}
