# axp.one final round: truth audit (changes only)

Date: 2026-10-02, about 05:20 IST. Auditor: truth agent, read-only (this file is the only write).

Scope:
- **Landing:** `git diff axp-landing-v6 axp-landing-v7 -- apps/marketing design-system/prospectus`, plus the rendered
  text, meta, alt and aria of `http://localhost:3410/`. I fetched it twice, at 05:11 and 05:19. The second fetch picked
  up an uncommitted edit that is in flight in the working tree (see B1).
- **MVP:** `git diff axp-mvp-v4 HEAD -- apps/product-ui design-system/ledger packages/hosted/client.mjs`, plus the
  rendered text of `http://localhost:3420/` at `/`, `/opportunity/1..4/`, `/settlement/`, `/verify/` and `/live/`.
  I also generated the Present captions three ways:
  - from `src/present/beats.ts` through `scripts/beats-to-srt.mjs`, written to scratch;
  - with an in-memory projection (`project-core.mjs` and `narrative.ts`) of all three bundles: the live rehearsal, the
    first recording and the hosted e2e run;
  - for `/first-recording/`, from the static export `apps/product-ui/out/first-recording/`. The dev server does not
    serve that path; it returns 404.

Ground truth:
- `artifacts/v3-devnet-live-rehearsal/` (RESULT.md, replay/run.json, chain-check.json, organic/);
- `artifacts/v3/replay/run.json` (the first recording);
- `artifacts/hosted-live-e2e/` (used only to check the "a minute or two" claim);
- FRONTEND_PLAN section 2, and the owner notes landing-v4/v6/v7.

Gates:
- `node apps/marketing/scripts/lint-copy.mjs`: **pass** (58 files clean, plus out/index.html), both before and after the
  in-flight edit.
- `pnpm --dir apps/product-ui test`: **pass**, 35 of 35. This includes "a hosted live run bundle projects and passes the
  structural checks" and the parity test between the app's copy of the live-run client and
  `packages/hosted/client.mjs`.

**Summary: 2 blockers, 8 warnings.**
- B1 is live right now. An uncommitted edit relabels the old sandbox video as "From our live Devnet run".
- B2 is a mislabelled number in the Jev sheet.

Every other number on both surfaces traces to its own run. The narrative module adapts correctly across all three
bundles. I found no mainnet, lift, attention, partnership or industry-first claim; each of those words appears only in a
negation or in the "Planned" list.

---

## BLOCKERS

### B1. The landing now labels the first recording's video as the live Devnet run (runs mixed; in-flight, uncommitted)
- The working tree has uncommitted edits to `apps/marketing/src/data/copy.ts` and
  `apps/marketing/scripts/extract-specimens.mjs`:
  - `VIDEO.title` becomes "axp.one live Devnet run, four minute walkthrough";
  - `VIDEO.caption` becomes "From our live Devnet run.";
  - the chapters change to the 11 Present beats;
  - the extractor now reads `artifacts/v3-devnet-live-rehearsal/recording/axp-live-demo.mp4`.
- That recording **does not exist**: `artifacts/v3-devnet-live-rehearsal/` has no `recording/` directory. The committed
  `run.landing.json` still points at `media/axp-v3-four-minute-demo.mp4` and `media/walkthrough.vtt`. Both belong to the
  first recording. Its captions say "Original run: hosted sandbox", and it paid 0.010, not 0.011.
- The dev server hot-reloaded the edit. At 05:19 the Proof section of `:3410` reads "Watch the run / From our live Devnet
  run." over the old sandbox MP4, with aria-label "axp.one live Devnet run, four minute walkthrough". At 05:11 it still
  read "From our earlier sandbox run."
- There is also a mismatch inside the slice: 11 chapter titles in copy against 10 chapter timestamps in
  `run.landing.json`.
- **Fix:** either finish the swap first (record the live demo, re-run `extract-specimens` so the slice points at the new
  MP4 and VTT, and the 11-chapter assert passes), or revert the two files. The caption must never say "live Devnet" while
  the file is the sandbox recording.

### B2. Jev sheet: "Creative: Fits, 81% confident" shows a probability, not Jev's confidence
- `copy.ts` `JEV_SECTION.outputs[2]` uses `conf(J.creativeProbability)`.
- For the ClearVault cached history call, the live run's `rawOutput.answers.creative` has `confidence: 0.61` and
  `probabilities[chosen]: 0.81`.
- The other two rows use Jev's confidence field correctly: relevance 0.87 and intent 0.51 both match. So the third row
  states a confidence Jev did not return.
- **Fix:** either show 61% confident, or relabel the row as "81% likely" (or "fit, 81%").

---

## WARNINGS

### W1. The landing meta description still says "hosted Solana sandbox"
- `apps/marketing/src/app/layout.tsx:15` reads "A working MVP on a hosted Solana sandbox with test USDC."
- The page now headlines the live Devnet run, and the MVP's own description was updated. Link previews will contradict
  the page.
- **Suggest:** "A working MVP, live on Solana Devnet with test USDC."
- A related nit: `copy.ts:133` still has the old comment ("The recorded run settled on a hosted Solana sandbox; Devnet is
  a public re-settlement"). It does not ship, but it misleads future edits.

### W2. MVP Overview "Run activity" says "Agent decisions 5" right under the "Agent decisions 15" tile
- The lane counts `buyer_decision` events (`derive.ts:68`): the 5 admitted bids, not the 15 Jev calls.
- This is pre-existing, but it is now on the default run's front page.
- **Fix:** rename the lane "Bids entered" (or similar).

### W3. Opportunity 3 says its excluded agent was asked "for the research comparison"
- The caption is in `stages.tsx:145` and `:298`; the glossary says the same.
- On the repeat question only the history arm ran (category `repeat`, not `paired`). LeatherGuard was asked, but not
  as part of a paired research comparison.
- **Suggest:** "was still asked (its answer could never count)" on opportunities where the arms were not paired.

### W4. "Run it live": "your browser … signs off delivery" reads as if the browser signs
- In the code, the page checks the label and the exact text in its own DOM, and then **the app** signs the receipt.
  The panel below says exactly that.
- **Suggest:** "your browser shows the Sponsored cards and confirms delivery".
- The rest of the live copy is accurate and bounded:
  - "a minute or two" is backed by the hosted e2e run (about 1.2 minutes, 22:48:30 to 22:49:41Z);
  - the rehearsal took about 6.4 minutes because of organic retries;
  - daily, network and one-at-a-time caps are explained;
  - it says "Devnet test USDC. Nothing of value moves.";
  - it says undelivered cards are never charged.

### W5. The static export `apps/product-ui/out/` is stale
- It was built at 04:42, before 6433a29 (04:45), so both runs there still carry the old ContextHint definition ("A
  recorded library of prompts…").
- **Fix:** rebuild with `pnpm build` (build-all) before deploying.
- Separately, the dev server's run switcher says "The only run published here." because the `AXP_OTHER_RUN_*` env vars
  are unset in dev. The built output correctly links both runs and says "numbers never merged". Judges on a dev URL
  would see the wrong note.

### W6. Latent narrative wording that assumes direction or participants (true for every shipped run today)
- **"rose" when the bid changed:** beat 5 (`beats.ts`: "its ${which} rose from level…") and Present (`page.tsx:264`:
  "levels rose from … so the bid table gave …") say "rose" whenever `changed && bidChanged`. A run where history
  *lowered* a level would read wrong. `page.tsx:203` already handles up and down; reuse that.
- **"no agent was asked" without a check:** in `noFillSentence`, the first two branches say "no agent was asked"
  without checking `o.decisions.length`. Paired research arms can call Jev on excluded campaigns. The callers in
  `stages.tsx` and beat 8 guard this, but `auctionSentence(nofill)` does not.
- **Tie-rule glossary names the wrong pair:** it names `ids[0]` and `ids[1]` of *all* campaigns, not the tied bidders.

### W7. "Planned: Advertiser wallets" sits next to an MVP that says "Each advertiser has its own test wallet"
- Both are true. The live run used two operator-run disposable payers; the plan is advertiser-held wallets.
- A judge could still read them as contradicting each other.
- **Suggest:** "Advertiser-held wallets".

### W8. Owner-sanctioned but strong: "no transaction per ad, so sub-cent ads work" (landing Solana lede)
- The run itself has 4 channel transactions for 3 deliveries, and the MVP says so honestly.
- The line came from the owner's v6 note ("what makes sub-cent ads viable"), so this is not a blocker.
- **Suggest:** "can work" if the owner agrees.

---

## VERIFIED

### Landing (`:3410`)

| Claim shown | Source | Status |
|---|---|---|
| Hero focal tile: question "cheapest hardware wallet that still supports ethereum and solana" + answer excerpt | live `organic/cached.json`, `run.landing.json` turns[0].organic | OK |
| "From our live Devnet run. ClearVault is fictional." | extraction reads `artifacts/v3-devnet-live-rehearsal/replay`, asserts runId + `financialMode: devnet` | OK |
| Auction plate: ClearVault 0.004 vs KeyForge 0.003, "Highest bid wins; price set in code" | cached history arm: CV R3 I3 → 4000, KF R3 I2 → 3000; winner CV at 4000 | OK (real competition, not the recorded tie) |
| Agents plate "judged with Jev": Bid / LeatherGuard ruled out | cached: LG excluded `missing_constraint`, skipped R1 | OK |
| Evidence plate: Prompt + "Audience: Crypto holders and stakers…" | `run.landing.json` evidence.hintText (inferred hint, same catalogue) | OK |
| Payment plate / Solana section: 0.020 deposit, vouchers 0.004 then 0.007, 0.007 to the app, 0.013 refunded | chain-check CV: deposit 20000, payout 7000, refund 13000; vouchers 4000→7000 | OK |
| "KeyForge 0.004 paid, 0.016 back"; "0.011 USDC to the app, 0.029 back" | chain-check KF 4000/16000; totals 11000/29000 | OK (live numbers; not 0.010/0.030) |
| Explorer links (program, 2 channels, 2 opens, 2 closes) | `devnet.json` from `run.chainEvidence`; matches RESULT.md signatures; all `cluster=devnet`, finalized | OK |
| "Live on public Solana Devnet, test USDC" / "Public Solana Devnet, test USDC, no real value" / footer "Not mainnet." | financialMode devnet | OK |
| Jev sheet: Relevance "Direct fit" 87% confident; Buying intent "Ready to buy" 51% confident; bid 0.004 = the cap | CV cached history: rel 0.87, int 2.51 → level 3 at conf 0.51; policyBid(3,3,4000)=4000 | OK (intent is a knife edge at 0.51, shown honestly); **creative row: B2** |
| "Built with Jev by TypeSafe" → docs.typesafe.ai; "judged with Jev" | owner rule: built with / judged with only | OK, no partnership wording |
| Proof: 4 questions, 15 agent decisions, 3 signed deliveries, 2 Solana channels, 47 checks | run counts; MVP verify lists 4+15+3+3+3+3+3+3+2+5+1+1+1 = 47 | OK |
| "What's real, what's illustrative" + "One run: a demonstration, not a benchmark" | | OK |
| ContextHint: "the intelligence platform for ChatGPT ads"; scale words only (thousands / tens of thousands / hundreds of thousands / a dozen countries); "More than a thousand marketers use ContextHint every day, including paying customers." | owner v4/v6/v7 | OK; no exact counts (no 11,730 / 45,947 / 420,540 / 983 / 7,121 / 1,178 / 331 anywhere in text, alt, aria) |
| Ad wall label "Real ads observed in ChatGPT. Not axp.one advertisers; no relationship implied." above the wall | owner v6 | OK (shot `landing-v7/sections/1440x900-05-data.png`) |
| "Agents get a few real past examples and an inferred audience." | history packets carry 1 to 3 `observed` + 1 to 2 `hints` | OK |
| No internal IDs | text/alt/aria scan: no `v3-`, `opp-`, `jev-1`, `gpt-`, `deepseek`, lamports, base units, hashes, policy names; slice writer asserts the same | OK |
| Forbidden claims | "mainnet" only in "Not mainnet." and "Planned: Mainnet, after Devnet"; no lift, attention, viewability, partner, industry-first, "under a second" rendered | OK |
| Tour captures (overview, opportunity, settlement, verify) | images show "Live Devnet run, Oct 1", 0.011 / 0.029, 47/47, Devnet slots | OK (live run) |
| Video | **B1** (in flight) | |

### MVP (`:3420`, default = live Devnet run)

| Claim shown | Source | Status |
|---|---|---|
| Overview: 4 questions (3 filled, 1 no fill); 15 decisions, 5 became bids; top 0.004, lowest 0.003, 3 auctions won; paid 0.011, refunded 0.029; 4 Devnet transactions; 47 checks | run.json + chain-check | OK (but see W2 for the lane) |
| Highlight: "same question asked again … ClearVault … placed twice … frequency cap kept it out … KeyForge won at 0.004"; "In opportunity 2 the bids tied … In opportunity 1 the highest bid won." | repeat: CV history said bid (R3 I2), not admitted; KF R3 I3 → 4000; offline tie 3000/3000 | OK |
| "Opportunities are in the order they ran." | events: cached 22:13:24, offline 22:14:09, repeat 22:14:56, mobile 22:16:23 | OK (derived, not hard-coded) |
| Opp 1: intent 2.34 → 2.51 "crossing the 2.5 rounding line: level 2 to 3"; KeyForge 2.38 → 2.46 "both round to level 2"; "would bid 0.003 … with history it bid 0.004 … not a measured lift" | raw outputs text_only vs history | OK |
| Opp 2: tie at 0.003, same caps, same 0.004 max, same ratings (3, 2); lower campaign ID wins | offline both R3 I2 → 3000; tieBreakApplied | OK |
| Opp 3: "Agent said bid. Exchange did not admit it." (no amount); KeyForge only bidder at 0.004 | | OK (W3 wording) |
| Opp 4: "Every campaign was missing mobile software wallet … no agent was asked." | 0 callEvidence for mobile; RESULT "0 model calls" | OK |
| Settlement: 0.040 deposited, 0.011 paid, 0.029 refunded, 2 opens + 2 closes finalized, fees + new rent 8,406,760 within 20,000,000; slots 506,421,333 to 506,422,702; funding tx "not settlement"; per-channel 7000/13000 and 4000/16000 | chain-check | OK |
| Verify: 47 checks, tamper changes a receipt nonce, 2 fail | `verify.test.mjs` tamper cases | OK |
| Footer: "Settled live on Solana Devnet in Devnet test USDC; not mainnet, not real money." Agent decisions by jev-1.13.0; organic by deepseek-flash | RESULT model usage | OK (internal detail belongs in the MVP) |
| ContextHint definitions (glossary, overview pillar, Present evidence beat) lead with "the intelligence platform for ChatGPT ads (contexthint.com)" | 6433a29 | OK in source / dev; stale in `out/` (W5) |
| Present captions (live): 1 to 11 | generated from `beats.ts` against the live projection | OK: "One live run"; 4/15/3/3; Mercari exact-question evidence; 0.003 → 0.004 with disclaimer; "highest bid won, ClearVault paid 0.004"; cap + "zero agent calls"; "0.004 then 0.007 … 0.011 USDC in total on Solana Devnet"; 47 checks; "zero new calls"; "Not mainnet, not attention, not targeting lift" (negation) |
| Present limitations (live) | `onePayer` false → "Each advertiser has its own test wallet; the demo operator runs all of them." | OK (two payers) |
| narrative.ts never states an absent outcome | projected all three bundles: first recording → ties on 1 and 2, KF only bidder 0.003, paid 0.010, 48 checks, "re-settled on Devnet"; hosted e2e → ties on 1 and 2, KF 0.004, 0.011; live → "different" on 1, tie on 2 | OK (latent wording in W6) |
| Runs never mixed | `/first-recording/` (out/) shows 0.010 / 0.030, 48 checks, "hosted sandbox, re-settled on Devnet"; main shows 0.011 / 0.029, 47; switcher "Separate runs; their numbers are never merged." | OK in the build (W5 for dev). Landing: OK except B1 |
| Run it live | caps (daily, per network, one at a time), Devnet test USDC, "Nothing of value moves", undelivered never charged, operator-needed states | OK (W4 wording) |
