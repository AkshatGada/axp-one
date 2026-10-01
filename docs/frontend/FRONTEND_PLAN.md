# AXP.one frontend: end-to-end plan (landing page + MVP)

## Context
- **Already built** (in `/Users/akshat/agentic-dsp`): the AXP backend, the exchange algorithm and one real recorded run, `v3-wallet-acceptance`. That run covers 4 real questions, 15 actual Jev decisions, 3 auctions and 1 policy no-fill, 3 disclosed Sponsored cards with signed receipts, and 2 payment channels settled on a hosted Solana sandbox: 0.010 test USDC to the publisher, 0.030 refunded.
- **Missing:** any designed UI. `apps/v3-ui` is only a functional test console.
- **My job:** the whole UI/UX. That covers journeys, information architecture, two design systems, motion, both frontends, the demo video, and a deploy-ready static build.
- **Owner constraints:**
  - 2–3 days.
  - Judges open a URL themselves, plus a recorded video submission.
  - Light paper with one dark stage.
  - Two design systems on one foundation, like contexthint.com.
  - Presentation is everything, and every claim must stay true.

**Outcome:** two separate experiences, one deployable static artifact.
1. `apps/marketing` (Prospectus system): the public AXP.one vision page, with a dedicated ContextHint data-moat section. It links to the MVP.
2. `apps/product-ui` (Ledger system): the MVP explorer of the recorded run. It covers advertiser onboarding, evidence, agent decisions, auction, disclosed delivery, receipts and settlement. It also has a Present mode (the video source) and a Verify page that recomputes real hashes in the judge's browser.

**Already done:** branch `frontend`, commit 68145ea, not pushed.
- Steel foundation: `design-system/foundation/{steel.css, provenance.ts, marks.tsx, index.ts}`.
- Next.js static-export scaffolds for both apps, plus `pnpm-workspace.yaml`. Root `package.json` and `npm test` are untouched.
- First-draft `docs/frontend/DESIGN_SYSTEMS.md` and `FRONTEND_PLAN.md`. Both get rewritten from this plan.

---

**Owner decisions (2026-10-02 update):** identity = ULTRAMARINE on warm paper with a deep ultramarine-night stage; ContextHint keeps vermillion in its own section; lowercase wordmark `axp.one`; textured metal rejected. See DESIGN_SYSTEMS.md top note.

**Owner decisions (2026-10-01):**
- Show real brands in observed evidence, always labelled "Observed historical reference, not an AXP advertiser".
- Include the 3 receipt signatures + publisher public key, so Verify checks Ed25519 live.
- Build the Try sandbox, first to cut.
- The ContextHint section names ChatGPT: "ads shown inside ChatGPT". Still never claim algorithm replication or an OpenAI partnership.

## 1. Design systems (shared foundation + two systems)

**STEEL foundation:** `design-system/foundation`, already built.
- **Colours:** paper #f5f4f0, ink #171b1f, muted #444d53, steel #626c73 as the only accent, one matte stage #1b2226.
- **Type:** PolySans only. Wide Slim 300 for display, Neutral for body, Mono only for real data (amounts, hashes, IDs, timings).
- **Shapes:** square, with flat hard offset shadows and 1px rules.
- **Motion:** one easing curve.
- **Provenance marks:** a shape glyph plus a word, never colour alone: ■ Actual output, ● Observed, ◐ Inferred, □ Fictional, ◆ Policy, ▬ Settled, ⬚ Synthetic, ◎ Recorded replay, △ Illustrative, ⋯ Planned.
- **Money-state marks:** by fill pattern: deposit, reserved, accepted, authorized, settled, refunded, pending, unknown.

**PROSPECTUS (landing):** `design-system/prospectus`.
- **Register:** an editorial prospectus for a new market: big, quiet, cinematic, scroll-choreographed.
- **Type scale:** fluid. Display xxl clamp(72,12vw,184) down through h1–h3, lead, body 18, caption.
- **Layout:** 1520 stage with asymmetric grids.
- **Primitives:** `Words`, `Display`, `Section`, `Opener` (question-led), `SplitGrid`, `Figure`, `Exhibit`, `BigStat`, `StatGrid`, `ActionPrimary`, `ActionText`, `SourceNote`, `RoleRail`, `PrincipleLedger`, `NowNext`, `AudienceTile`, `ProvenanceLegend`, `SiteHeader`, `SiteFooter`, `VideoFigure`.

**LEDGER (MVP):** `design-system/ledger`.
- **Register:** an instrument, a financial document crossed with a flight recorder.
- **Type scale:** fixed. Title 40, h1 28, h2 20, body 16, label 13, data mono 15. Status text never under 14px.
- **Frame:** `AppFrame`, `ScopeBar`, `RunSpine`, `Inspector`, `Term` (inline glossary).
- **Primitives:** `KeyValue`, `DataTable`, `SheetHeader`, `Callout`, `CopyHash`, `Lamports`, `StatusStamp`, `KeyHint`.
- **Domain specimens:** `HostChat`, `OrganicAnswer`, `SponsoredCard`, `NoFillSlot`, `CapabilityChips`, `EligibilityMatrix`, `EvidencePacket`, `ObservedRecord`, `InferredHint`, `MethodBadge`, `DecisionCard`, `ScoreRuler`, `ArmDiff`, `BidTableGrid`, `AuctionBoard`, `TieBreakNote`, `AwardTicket`, `ReceiptSheet`, `ChargeLine`, `VoucherStep`, `StepRail`, `RouteLine`, `ChannelMeter`, `CumulativeLadder`, `TxCard`, `FeeTable`, `LedgerTimeline`, `ChainLedger`, `CampaignSheet`, `PublisherSheet`, `VerifyRow`.
- **Present mode:** `PresentStage`, `CaptionBar`, `BeatTicks`, `FocusLayer`.
- **Try sandbox:** `SyntheticFrame`, `DraftForm`, `LevelPicker`, `TryResultRow`.
- **Shared with the landing page:** the domain specimens (HostChat, SponsoredCard, ReceiptSheet, AuctionBoard, ChannelMeter, EvidenceChain) live in Ledger. The landing page may embed them inside an `Exhibit` frame; that is the only sanctioned crossing between the two systems.
- **Showcases:** each app gets a `/design` page (noindex) for owner review before pages are built.

---

## 2. Truth rules and data traps (apply to both)

- **Allowed claim:** "AXP uses real conversational-ad observations and inferred targeting evidence to inform advertiser-agent placement decisions."
- **Never claim:**
  - AXP partnerships or enrollment, pricing, industry-first
  - attention or viewability, conversions, targeting lift, sub-50ms speed
  - mainnet, x402 in this run, independent advertiser wallets (one payer funded both)
  - ChatGPT algorithm replication
- **Data traps found in `run.json` that copy must respect:**
  1. **History moved intent only across a rounding line.** On the cached question it went 2.38 → 2.52 (ClearVault) and 2.29 → 2.50 (KeyForge). Show the score ruler with the 2.5 line. Show "unchanged" outcomes with the same weight as changed ones. Never say "lift".
  2. **LeatherGuard did reach Jev,** in the paired research arms. It was blocked by policy and also skipped by its own agent. Say "cannot enter the auction", not "never reaches an agent".
  3. **ClearVault's repeat decision said bid (3:3) but was not admitted** (frequency cap). Show "Agent said bid. Exchange did not admit it." Show no amount.
  4. **Story order ≠ run order.** The mobile no-fill ran first. Navigate in story order and disclose the real chronology on Timeline.
  5. **Two clocks.** Sandbox block times (14:36–14:42Z) are earlier than the exchange charge times (14:57–15:00Z). Never put them on one axis.
  6. **`receipts[]` is not in turn order.** Join receipts by `awardId`.
  7. **The publisher ID is `owned-travel-app`** (legacy). Display it as "Owned reference publisher app" with a footnote.
  8. **Jev raw output has a conversion-probability field.** Never show it.
  9. **Absolute publisher balances** include funds from before this run. Show per-transaction deltas only.
- **Data sources:** numbers come only from build-time extraction scripts with arithmetic asserts: 4000+3000+3000=10000, payout+refund=deposit, every bid = computeBid(levels).
- **Copy lint:** a script blocks em/en dashes and forbidden terms. Negation lines are marked `// claim-ok`.

---

## 3. Deliverable 1: landing page (`apps/marketing`)

### Journeys
- **Judges** (technical and business), advertisers, AI-app publishers, investors. Each gets a 10s / 60s / 3-minute layer.
- **Primary action:** "See the working MVP". It sits in the header, the hero, the end of Proof and the closing.
- **Secondary:** "Watch the four minute video" (in-page `#video`) and "Skip to the proof".
- **Tertiary:** ContextHint (https://contexthint.com).

### Page order (one argument: what → why → how → money → moat → trust → proof → next)

1. **Header.**
   - Contents: AXP.one wordmark, a "Hackathon MVP" chip, anchors (How it works / Data / Proof / Next), and an ink "See the MVP" button.
   - Hides on scroll down; flips colours over the dark stage.
2. **Hero: "The Exploded Card"** (signature moment).
   - **Load:** the H1 "The advertising exchange for the agentic internet." Beside it, a host chat plays the real cached question and answer, then the real ClearVault Sponsored card lands.
   - **Scroll (pinned ~320vh):**
     - The camera pulls back and the chat becomes an isometric plate.
     - The stack explodes into six plates joined by a dashed steel route: Answer / Card / Auction (two 0.004 bids, tie rule) / Agents (bid, bid, skip) / Evidence (observed prompt → observed ad → inferred hint) / Payment (channel meter).
     - Leader-line callouts each carry a provenance mark. One marker travels Card → Payment (Illustrative).
     - Line: "Behind one Sponsored card, a whole exchange."
   - **Technique:** 2D isometric matrices, not preserve-3d.
   - **Fallback:** if the hero isn't convincing by hour 3, fall back to a 2D vertical separation.
3. **The shift + six parties.**
   - "Where does advertising go when the answer is a conversation?"
   - Three beneficiaries: person asking, advertiser, AI app.
   - A RoleRail of six parties: advertiser, buying agent, exchange, AI app, person, payment worker.
4. **Shutter → dark Stage: "What happens between the question and the card?"**
   - A square aperture opens.
   - Pinned 7 beats on a schematic switchboard. Real values, illustrative motion:
     1. The app offers a moment.
     2. Eligibility in code (LeatherGuard ruled out).
     3. Own evidence per agent.
     4. Agents judge (I2 → I3 with history).
     5. Code sets the price (fit_intent_bid_v1, tie, reserve).
     6. Delivered, disclosed, signed (charge 0.004 only now).
     7. Settled once (0.004 → 0.007 voucher, paid 0.007, refund 0.013).
   - Exit line: "Agents advise. Code decides the money."
   - Includes a skip link.
5. **Payments band:** "Pay for each delivery without a transaction for each ad."
   - ClearVault's real channel meter fills and settles as you scroll.
   - Comparison lane: one transfer per ad (Illustrative). x402 appears only as Planned.
6. **ContextHint: "What does an advertiser's agent know? Built on ContextHint."**
   - **Traction:** ContextHint is an existing product with thousands of users and paying customers. This is ContextHint's traction, not AXP's.
   - **Big stats** (mask rise, no count-up): 11,730 advertisers / 45,947 creatives / 420,540 placements / 983 niches (970 with ads) / 7,121 sub-niches (5,991 with ads). Source line: snapshot Sep 26, 2026; placements Jun 19–Aug 24.
   - **"Library Dive":** a field of 983 niche squares. The real niche flies in and becomes the evidence chain the agent saw (prompt → ad → inferred hint → handed to ClearVault's agent → intent 3 not 2).
   - **"Three numbers, kept apart":** library → screened slice (1,178 / 241 / 537 / 331) → one packet.
   - **Moat line:** "An auction is code. A record of which ads appeared beside which questions has to be collected."
   - **Data-context note:** US-heavy (330,777 US-tagged), 12 Fresh Ads countries, hints are hypotheses, observed brands are not AXP advertisers, no ranking replication or lift.
   - "Visit ContextHint" button.
7. **Principles: "Rules the money cannot break."** Seven rows; each principle is paired with what happened in the run:
   - award ≠ charge
   - losing bids cost nothing
   - disclosure
   - ads never rewrite the answer
   - can't buy past eligibility (mobile no-fill)
   - restart can't double charge
   - agents advise, code decides
8. **Proof: "Does it actually run?"**
   - Stat bar.
   - RunSheet exhibit: 4 opportunity rows, sandbox / test USDC / replay header, manifest hash.
   - KeyForge's real Sponsored card plus its signed receipt as exhibits.
   - Settlement table.
   - "What this run does not show".
   - Button into the MVP.
9. **Video:** the existing 240s MP4 (or the new Present-mode cut) with poster, VTT from `walkthrough.srt`, and chapter buttons. Recorded-replay mark, no autoplay.
10. **Now and next.**
    - Working now (■) vs building next (⋯ Planned): planning agents, publisher SDK, more categories, x402 adapter, MCP tools, advertiser-owned wallets, devnet then mainnet, network fees, viewability and fraud measurement.
    - Three tiles: advertisers, AI apps, agent builders (Planned).
11. **Closing:** the six plates collapse back into one card (the hero reversed).
    - "Disclosed. Decided in code. Paid on delivery."
    - Buttons: MVP, video, ContextHint.
12. **Footer:** big AXP.one, full ProvenanceLegend, scope lines (fictional advertisers, sandbox, snapshot date).

### Copy
The full draft copy for every heading and line comes from the landing design pass. It lives in `apps/marketing/src/data/copy.ts`, so the lint can scan it.

### Motion and technical approach
- **Libraries:** motion v12 (scroll-scrubbed) and Lenis on fine pointers.
- **Ported from ContextHint home v4:**
  - `motion.ts` helpers: `seg`, `out`, `io`, `sceneHeight`
  - `MotionRoot` / `MOTION_SCRIPT`, `useReduced`, `Rise`, `FooterReveal`
  - the card-to-sheet handover technique from `/Users/akshat/ch-home-v4/src/components/home/v4/Hero.tsx` and `DeckScene.tsx`
  - Port the craft, restyled square.
- **Rendering rules:** transform, opacity and clip-path only; `overflow: clip` for sticky; at most ~14 animated layers per scene.
- **Below 900px and under reduced motion:** static sequences with the same words.
- **Film mode:** `?film=1` scrolls through a fixed cue list (hidden cursor, no tilt) so the video is repeatable. `?still=1` gives screenshots and the OG image.
- **Budgets:** JS ≤170KB gzip; LCP is the H1 text (under 1.8s desktop); Lighthouse performance ≥90 desktop / ≥80 mobile, accessibility 100.
- **SEO and meta:** title, description, OG 1200×630, favicon, `noindex` until the owner approves the deploy. No analytics.

### Data
- `scripts/extract-specimens.mjs` turns `run.json` + `manifest.json` into `src/data/run.generated.json`, with asserts.
- `src/data/library.ts` holds the owner-supplied ContextHint figures with the snapshot date and source.

---

## 4. Deliverable 2: MVP (`apps/product-ui`)

### Journeys
- **(a) Cold judge from the landing page.** The first 30 seconds orient them, then: opportunity 1 step-through → spine to 2–4 → Settlement → Verify.
- **(b) Owner presenting or recording.** `/present/` with keyboard control; `?auto=1` for timed playback; `E` jumps to the explorer for live Q&A.
- **(c) Advertiser.** `/advertisers/` (recorded onboarding) → a campaign page → `/try/` (synthetic draft).
- **(d) Publisher.** `/publisher/`: slot, fill table, receipts, payout, independence of the organic answer.
- **(e) Skeptic.** `/verify/` recomputes the hashes and checks in the browser, offers the JSON download, and shows proves / does-not-prove.

### Routes (static export, `trailingSlash`)

| Route | Purpose |
|---|---|
| `/` | Overview |
| `/opportunity/[1-4]/` | Core screen |
| `/advertisers/` and `/advertisers/[clearvault\|keyforge\|leatherguard]/` | Onboarding and campaign sheets |
| `/publisher/` | Publisher view |
| `/settlement/` | Channels and payments |
| `/timeline/` | Exchange events and chain transactions, two lanes |
| `/evidence/` | ContextHint slice |
| `/verify/` | Browser checks |
| `/try/` | Synthetic sandbox |
| `/present/` | Present mode |
| `/design/` | Ledger showcase |

- **Deep links:** every step, decision, evidence record, voucher and transaction (`#decision-clearvault-history`, `?inspect=receipt:<id>`, `/present/#7`).
- **Persistent chrome:**
  - Top ScopeBar: run ID, ◎ Recorded replay, Hosted Solana sandbox, Test USDC, □ Fictional advertisers, Present, Verify.
  - Left RunSpine:
    - Setup.
    - Opportunities 1–4, each with an outcome line and running total (0.004 / 0.007 / 0.010 / 0.010).
    - Settlement / Timeline / Verify.
  - Right Inspector drawer: raw JSON, source path, hashes marked recomputable vs "recorded hash only".
- **Mobile:** the spine becomes a scroller and the inspector a bottom sheet.

### Screens
- **Overview.**
  - Headline: "One recorded run of an ad exchange inside an AI app."
  - Right: a HostChat specimen.
  - A 5-number strip and a "What happened" table (question, winner, price, why).
  - Buttons: Watch the guided replay (Present autoplay) / Step through opportunity 1.
  - A provenance legend line.
- **Opportunity (core).**
  - **Header band:** question in display type plus an outcome strip of jump links.
  - **Left, sticky "In the app":** HostChat, the only non-square shape, because it is a third-party UI. Shows the organic answer (■, gpt-6.1-sol, no advertiser material) and the separate Sponsored slot.
  - **Right "Behind the answer":** a StepRail of 9 steps, each with real values, plain explanations and marks:
    1. Moment
    2. Who may compete (EligibilityMatrix)
    3. What each agent was shown (EvidencePacket: method badge, observed example and similarity, inferred hint, neighbours, quality flags, packet with recomputable hash)
    4. What each agent decided (3×2 DecisionCards, ScoreRuler, ArmDiff with fixed honest wording, policy line)
    5. Auction (bid formula rows, floor, rejections, tie-break)
    6. Award (reserved, "not a charge yet")
    7. Delivery (card animates into the slot; acknowledgement hash ✓; +25.4s)
    8. Signed receipt (10 fields, hash ✓, signature ✓)
    9. Charge and voucher (accepted, cumulative)
  - **Opportunity 2:** lexical fallback ("overlap score", not cosine); "Unchanged" badge.
  - **Opportunity 3:** frequency-cap stamp "Agent said bid. Exchange did not admit it."; KeyForge 2.49 just under the line; same organic input hash but a fresh answer.
  - **Opportunity 4:** NoFill. Zero calls; steps 3–9 collapse; the chat still answers; a quiet "No sponsored placement for this turn" note, never an empty ad box.
  - **Guided step-through (`J`/`K`):**
    - Before step 7 the slot is a dashed "awaiting auction" outline.
    - Each step dims the others to 35% and draws a steel route line to the chat region.
    - Values reveal with no count-ups, spinners or "thinking" text.
    - A "Replaying recorded run · step n of 9" chip; recorded timings in mono.
    - The URL hash updates per step.
- **Advertisers.**
  - A five-stage stepper (Declare → Approve → Limits → Fund → Frozen), with all three campaigns side by side.
  - `.example` URLs are shown as text, never linked.
  - LeatherGuard shows "Unfunded: no channel opened".
  - Campaign pages show a row per opportunity; LeatherGuard's leads with "excluded by rule and skipped by its own agent", plus the leather-wallet evidence (the word "wallet" is ambiguous).
- **Publisher.**
  - Slot `v3-wallet-sponsored-card`, floor 0.001, key `local-publisher-v1`.
  - Fill table: 4 offered / 3 filled / 1 no-fill.
  - Receipts, payout 0.007 + 0.003.
  - Caveat: a receipt is not attention.
- **Settlement.**
  - Per channel: ChannelMeter scaled to the 0.020 deposit.
  - CumulativeLadder (#2 replaces #1's authority: 0.007 in total).
  - Open and close TxCards with token deltas, fee, new or reclaimed rent, finalized status.
  - Totals with USDC and lamports kept apart; the fee and rent cap check.
  - Funding note: "faucet top-up is funding, not settlement".
  - Logical sequence with no timestamps.
- **Timeline:** the exchange log (by sequence, grouped by turn, mobile first) and the sandbox chain lane (by slot), with the banner "different clocks, not aligned".
- **Evidence:**
  - Slice counts, tiers, sources and the method.
  - The 13 records and 5 hints actually used, each "Observed historical reference: not an AXP advertiser".
  - No top-brands list.
- **Verify:**
  - About 30 WebCrypto checks against the downloadable `run.public.json`: question, packet, creative, acknowledgement and receipt hashes; Ed25519 receipt signatures; linkage; cumulative arithmetic; conservation; bid policy; tie-break; fee cap.
  - A failure shows loudly. Graceful fallback when Ed25519 isn't supported.
  - Restart evidence; proves / does-not-prove.
- **Try (synthetic, first to cut):**
  - Banner: "Synthetic preview. Runs in your browser only. No model, evidence, money, or change to the run."
  - **Draft form,** mirroring the `saveCampaign` limits:
    - 8 capabilities
    - creative ≤800 characters
    - hints ≤400 characters
    - no email addresses
    - creative + hints + 34 ≤ 1200
    - max bid ≤4000
    - budget ≤8000
    - funded toggle
    - presets
  - **For each of the 4 recorded opportunities:** eligibility (ported `reason()`) → user-set levels, with ghost reference levels from another campaign's real output, stamped "borrowed" → bid (ported `computeBid`) → "recorded winning price here".
  - No simulated award or win claim.
  - Parity tests against `packages/contracts/index.mjs` and `packages/exchange/index.mjs`, shown as "Rules verified N/N".
- **Present mode (~4:00).**
  - A 16:9 stage scaled from 1920×1080, with a caption bar, beat ticks and the replay mark.
  - Beats are data in `src/present/beats.ts`; captions are computed from the projection.
  - Ten beats:
    1. Chat and card
    2. Run numbers
    3. Advertisers
    4. Evidence hook (the cached question was observed before)
    5. Decisions and ruler
    6. Code sets the bid and the tie
    7. Award → receipt → charge, with the live ✓ checks
    8. Cap and no-fill
    9. Settlement
    10. Verify and limits
  - Keys: → ← 1–0, A for autoplay, C for captions, E to the explorer, Esc.
  - `scripts/beats-to-srt.mjs` writes the SRT.

### Data layer
- `scripts/project-run.mjs` turns `artifacts/v3/replay/run.json` (+ `manifest.json`) into:
  - `src/data/run.public.json`
  - `public/run.public.json`
  - `build-meta.json` (source hashes, sanitization report, self-checks)
- **Processing:** sort into story order; join turn → opportunity → award → charge → receipt → voucher; reduce evidence to the referenced records (~14KB).
- **Strip:**
  - agent and agentRun IDs, `openSalt`, `rpc` / `settlementLink` (`customUrl`)
  - `packetBytes`, `request`, `callEvidence`, duplicate retrieval
  - `freeze` duplicates, `laboratory`, absolute balances
  - the full evidence catalogue
- **Never read:** `sandbox-topup.json`, `.env*`, `local-state/`.
- **Build fails on:**
  - leaked forbidden strings
  - numeric arrays over 64 long (a vector guard)
  - count mismatches (4/15/3/3/33/2/4)
  - broken conservation
  - a bid ≠ computeBid
  - output over 300KB
- **Code layout:**
  - `src/data/types.ts` reuses the unions from `packages/v3/client.d.mts`.
  - `src/data/select.ts` holds pure selectors.
  - `src/lib/policy.ts` ports the policy logic.
  - `verifyChecks` is shared by the build, `/verify` and the tests.
- Server Components pass slices only to client islands.

---

## 5. Build sequence (commit each step, tag versions, no push)

**Day 1**
1. Rewrite `docs/frontend/DESIGN_SYSTEMS.md` and `FRONTEND_PLAN.md` from this plan.
2. Run two Opus build agents in parallel, each in its own app and design-system folder, with commits restricted to their paths. The shared foundation is mine.
   - **Landing agent:**
     - Prospectus primitives + `/design` showcase (tag `axp-prospectus-v1`).
     - Extraction script, copy, lint.
     - Static page with all sections and stills (**review R1**: copy and claims).
     - Hero exploded card (**review R2**: 20-second clip).
   - **MVP agent:**
     - Projection script + policy port + verify checks (**review A**: `build-meta`).
     - Ledger primitives + `/design` showcase (tag `axp-ledger-v1`, **review B**).
     - Opportunity screen, all 4 states, with step-through (**review C**).
3. I review each checkpoint visually in the browser pane and send fixes. An audit agent checks each phase for claim drift.

**Day 2**
- **Landing:** Shutter + Stage, payments band, Library Dive, RunSheet/exhibits, video, Now/Next, closing, footer, mobile (**review R3**: a full film-mode scroll).
- **MVP:** Settlement, Timeline, Overview, Advertisers, Publisher, Present mode (**review D**: the 4-minute autoplay), Verify, Try (**review E**), mobile and accessibility.

**Day 3**
- Hardening: reduced motion, Lighthouse, Safari/iOS, copy lint, OG image.
- Single artifact: product-ui built with `basePath: '/mvp'`, merged into marketing `out/`.
- Record the video from Present mode: 1920×1080, Chrome clean profile, two takes, burned captions + SRT.
- Tags `axp-landing-vN` / `axp-mvp-vN`. Deploy only on the owner's explicit go.

**Cut order if time runs short:** `/try` → `/timeline` (folded into Settlement) → `/publisher` (folded into Overview) → campaign detail pages → landing Payments band (folded into Stage beat 7).
**Never cut:** the hero, the stage, the ContextHint section, Proof, the opportunity screen, Settlement, Present mode, Verify, and the provenance/scope labels.

---

## 6. Verification
- **Node tests** (`node:test`):
  - projection counts, ordering, joins, conservation, sanitization scan, size budget
  - policy parity against `packages/contracts` `computeBid` (16 level pairs) and recorded eligibility
  - all `verifyChecks` pass
  - a tampered-byte fixture fails
- **Static checks:** `tsc --noEmit` for both apps, `next build` static export, copy and claims lint.
- **Browser pane:**
  - **Pages:** every route and deep link at 1440×900, 1920×1080 and 390 wide, light, with zero console errors and no off-origin requests.
  - **Behaviour:** `/verify` all green; keyboard-only step-through; reduced-motion snapshot; film-mode run of the landing page; Present autoplay screenshots for beats 0–9.
- **Owner review points:** R1–R4 and A–E. Key screenshots only.

## 7. Risks
| Risk | Mitigation |
|---|---|
| Hero ambition | 2D isometric approach, time-box, fallback. |
| Scroll fatigue | Pinned budget of about 16 viewports, anchors, skip links. |
| Claim drift | Lint, audits, trap list. |
| Number errors | Extraction + asserts. |
| PolySans web licence on a public URL | RESOLVED 2026-10-02: owner confirms PolySans is licensed for the public deploy. |
| Real brands in observed evidence | Owner decision. |
| Safari sticky quirks | `overflow: clip`, no preserve-3d. |
| Ed25519 browser support | Feature-detect. |
| No deploy authorization | Static `out/` ready only. |
