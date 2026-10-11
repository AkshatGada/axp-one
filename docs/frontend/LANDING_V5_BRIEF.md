# Landing V5: common brief for every builder

V5 is V4 made calmer and more practical, after the owner's review of V4 (12 October 2026).
Workspace: `apps/marketing/src/v11/`, served at `http://localhost:3410/v5/` (a dev server is already
running; hot reload), one lab route per movement at `/v5/lab/<name>/`. V4 is tagged
(`axp-landing-product-v4`) and lives in `v10/` at `/v4/`: never edit it.

## What the product is
axp.one, "The advertising network for the agentic internet." People ask AI apps what to buy, in
full sentences. An advertiser's agent judges whether a moment fits what the advertiser listed; if it
does, one labelled Sponsored card appears BELOW the app's own answer; the app earns; fixed rules,
not a model, decide the money.

## The owner's decisions for V5 (these outrank everything else)
1. **Elegant, practical, editorial.** It must work as a serious company's website AND keep an
   editorial hand. Nothing flashy or oversized for its own sake. Ask of every frame: would this sit
   comfortably on a respected company's site, and is it still distinctly editorial?
2. **One flow, no knobs.** No controls in any figure: no switches, chips, buttons, toggles or
   pressable objects. Figures play on their own when they enter view, or with the reader's scroll,
   then rest complete. The only focusable things are real links.
3. **Do not dwell on "no ad".** The page does not spend time on moments where nothing is placed, or
   on empty, blocked or failed states.
4. **The cover is the 3D wall hero** (from the earlier V3). From "The shift" onward the owner likes
   V4's direction. **The doors are the V3 doors** (an ultramarine panel on paper).
5. Still binding: the Sponsored card sits BELOW the answer; a receipt is an accepted charge and an
   accrual, never a payout; no numbers, prices, currency, scores or performance; no customers,
   partners, signup or status framing; fictional names only; no provider or model names; no code;
   ContextHint appears only in the masthead; no orange, no purple.

## The foundation (read before building)
- `docs/frontend/LANDING_V4_PLAN.md`: the story and the editorial system.
- `v11/v11.css`: tokens, twelve-column grid (`x-wrap`, `x-grid`), type (`x-mega`, `x-h1`, `x-h2`,
  `x-h3`, `x-deck`, `x-body`, `x-cap`, `x-folio`), the switch marks (`x-sw`, now only as marks).
- `v11/kit/index.tsx`, `v11/kit/stage.tsx`: `Chapter`, `ChapterMark`, `Fig`, `Ad` (the one
  Sponsored card), `Split` (kinetic type), `Arrow`, `Action`, `TextLink`, `Stage`, `useStageMode`,
  `useInView` (has a fail safe so nothing stays invisible), `useReduced`.
- `v11/story.ts` (story data and truth rules), `v11/copy.ts` (frozen copy per movement).
- `apps/marketing/src/motion/MotionRoot.tsx`: motion is armed by `html[data-px-motion="on"]`;
  Lenis is at `window.__lenis`.
- Colours: warm paper, ink, one ultramarine `#2b3bff`. Type: PolySans (Wide for display). No
  monospace.

## Hard rules
- Write ONLY inside the folder(s) named in your brief. Never edit shared files (`v11/v11.css`,
  `v11/kit/**`, `v11/story.ts`, `v11/copy.ts`, `v11/shell/**`, `app/**`), other movements, `v9`,
  `v10`, or anything else. Proposals for shared files go in your folder's `NOTES.md`.
- No git command that changes state. Do not start, stop or restart servers. Do not run `pnpm build`.
- No em or en dashes in any file you write (a lint fails on them).
- All copy server-rendered and readable without JS. With motion off (`html[data-px-motion]` not
  "on", or prefers-reduced-motion) every movement is a complete, composed still. A reader must
  never see an empty or half-built figure, including on abrupt arrival (anchor link, fast flick,
  scrolling up from below).
- Transform and opacity only for motion; physical timing (the `--x-ease` family); text never scaled
  above its rendered size. No horizontal page scroll at any width. No console errors. No network
  requests.
- Laptop sizes 1440x900, 1366x768 and 1280x800 and phone 390x844 all get the same care.

## Verifying
- `cd /Users/akshat/agentic-dsp/apps/marketing && pnpm typecheck` (others edit sibling folders at
  the same time: ignore errors outside your folder, fix all inside it).
- Captures with playwright: import `launch`, `open`, `scrollTo`, `sheet` from
  `/Users/akshat/agentic-dsp/docs/frontend/reviews/tools/final/lib.mjs` (read it first; headless
  system Chrome; `scrollTo` drives Lenis). Save ONLY under
  `/private/tmp/claude-501/-Users-akshat-openai-ads/5055cf72-540e-45d1-835d-b2ccb6f92c15/scratchpad/v5/<name>/`.
  OPEN what you capture (Read tool) and iterate on what you see at least three times. Do not report
  on anything you did not open.
- Keep `NOTES.md` in your folder updated as you go. Final message: what you built, heights at each
  size, the captures you opened, what you verified, what you did not check. Be factual.
