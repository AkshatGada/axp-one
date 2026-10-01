# AXP.one landing page: build spec (apps/marketing, Prospectus)

Companion to FRONTEND_PLAN.md (approved). This file holds the detail a builder needs: claim traps,
scene choreography, the full copy draft and the data extraction contract.

## Claim traps (verified against artifacts/v3/replay/run.json)
1. LeatherGuard DID reach Jev (paired research arms) though policy excluded it (missing_constraint).
   Write "cannot enter the auction", never "never reaches an agent".
2. Jev raw output has a conversion-probability field. Never show it.
3. History raised intent 2 to 3 only on the cached question, by crossing the 2.5 rounding line
   (ClearVault 2.38 to 2.52). Offline pairs, relevance and bid participation unchanged. Never say "lift".
4. receipts[] is not in turn order (receipts[0] is the offline award). Join by awardId.
5. publisherId is "owned-travel-app" (legacy). Display "our demo AI app" / "owned reference publisher app".
6. Owner decisions: show real observed brands (Mercari "Nano Trezor" listing, OneKey) labelled
   "Observed historical reference, not an AXP advertiser"; ContextHint section may say "ads shown inside ChatGPT"
   (never algorithm replication or an OpenAI partnership).

## Scenes and motion
- Port the craft (not content) from the ContextHint home v4: /Users/akshat/ch-home-v4/src/components/home/v4/
  (motion.ts seg/out/io/sceneHeight, MotionRoot + MOTION_SCRIPT, useReduced, Rise, FooterReveal, Hero.tsx fly/handover,
  DeckScene.tsx pinned beats). Restyle square/Steel. motion v12 + Lenis (fine pointers only, one rAF).
- Transform, opacity, clip-path only. 2D isometric matrices (rotate/skew/scaleY), no preserve-3d.
  Pinned ancestors use overflow: clip. will-change only in view. <=14 animated layers per scene.
- Below 900px, reduced motion and no-JS: static sequences, same DOM and words.
- ?film=1: fixed cue list via lenis.scrollTo (hidden cursor, no tilt, hero intro at t0, &from=stage);
  ?still=1: forced still render for screenshots / OG image.

| Scene | Height | Driver |
|---|---|---|
| Hero stack | ~320vh pinned | time intro (CSS, ~2.4s) + scroll |
| Shutter | ~120vh | scroll (square clip-path aperture) |
| Stage | ~670vh pinned, 7 beats | scroll, beat state |
| Payments meter | ~160vh pinned | scroll |
| Library dive | ~260vh pinned | scroll |
| Closing collapse | ~140vh | scroll |

### Hero "Exploded Card"
- Load (~2.4s CSS): H1 words rise in clip masks (transform only). Right: HostChat specimen with the real
  cached question (lowercase as typed); at 0.6s the actual organic answer types in (first two sentences);
  at 1.6s the separate Sponsored card lands (label first, then ClearVault approvedText) on a hard offset shadow.
  Marks under the frame: Actual output, Fictional.
- Scroll p: 0-.15 headline lifts, frame to centre; .10-.40 camera pulls back, frame to ~0.6 and becomes an
  isometric plate; .30-.60 explode into six plates on a dashed steel route (FlowRoute):
  Answer / Card / Auction (two 0.004 bids, tie rule) / Agents (bid, bid, skip) / Evidence (observed prompt to
  observed ad to inferred hint) / Payment (channel meter); .50-.75 leader-line callouts with provenance marks;
  .75-.90 one steel marker travels Card to Payment (Illustrative); .90-1 next section rises over (Rise).
- Time-box 3h, fallback: 2D vertical separation.

### Stage (dark, after the Shutter)
Left 40% beat copy, right 60% schematic switchboard on --stage: top publisher tile, left rail three agent cards,
centre exchange core (eligibility gate, bid policy, auction, reservation), bottom channel meter + payout.
Active region full strength, others 0.28, route segment draws per beat. Progress ticks, no step numbers. Skip link.

| Beat | Lit | Values (mono, actual) | Marks |
|---|---|---|---|
| 1 | publisher tile, opportunity | question, crypto_storage required | Actual output |
| 2 | gate | ClearVault ok, KeyForge ok, LeatherGuard ruled out (missing_constraint) | Policy |
| 3 | ContextHint feed, separate lanes | 1 observed example + 1 inferred hint per wallet agent (vector, similarity 1) | Observed, Inferred |
| 4 | agent cards | ClearVault bid R3/I3, KeyForge bid R3/I3, LeatherGuard skip; text-only I2 to history I3 | Actual output |
| 5 | bid policy, auction | fit_intent_bid_v1, max 0.004, two bids 0.004, tie rule picks ClearVault, budget reserved | Policy |
| 6 | publisher tile, receipt | Sponsored card, receipt hash (short), accepted charge 0.004 | Actual output |
| 7 | channel | voucher 0.004 to 0.007; close paid 0.007, refunded 0.013 | Settled |

### Payments band
ClearVault ChannelMeter: outlined 0.020 deposit, hatched 0.004 then running 0.007 fill on scroll, on close the spent
part turns ink (paid 0.007), remainder outlined refund with return arrow (0.013). Beside it an Illustrative
"one transfer per ad" lane. x402 only as Planned.

### Library Dive (ContextHint)
Field of 983 squares (970 filled, 13 outlined; "Illustrative layout, counts actual"), stagger draw. Big stats beside
(mask rise, no count-up). Pinned fly-in: the square tagged with the run's actual niche
("crypto hardware wallets self custody", from manifest selection) travels to centre and hands over to an
EvidenceChain sheet: observed prompt to observed ad (Mercari listing) to inferred audience (hint ads:hint:88501) to
"Handed to ClearVault's agent" to "Intent rated 3, not 2". Then the funnel strip "Three numbers, kept apart".

### Closing collapse
Six plates collapse upward into one Sponsored card under the answer (hero reversed).

## Copy draft (no em/en dashes; data quotes keep original text)
Header: AXP.one / Hackathon MVP chip / How it works / Data / Proof / Next / button **See the MVP**

Hero
- H1: **The advertising exchange for the agentic internet.**
- Lede: Advertiser agents bid for a disclosed place beside the answer in AI apps. Code decides who wins and what it costs. Publishers are paid in stablecoins for each card they deliver.
- Actions: **See the working MVP** / Watch the four minute video / Skip to the proof
- Status: Working MVP on a hosted Solana sandbox with test USDC.
- Frame caption: A real question from our recorded run. The answer was written without any ad in view. The card was sold at auction.
- Pull back line: **Behind one Sponsored card, a whole exchange.**
- Callouts: **The answer.** Written by an assistant that never saw an ad. / **The card.** Labelled Sponsored and kept apart from the answer. / **The auction.** Two bids of 0.004 USDC. A fixed rule broke the tie. / **The agents.** Each judged the moment with its own campaign only. One said skip. / **The evidence.** A real prompt, the ad it drew and the audience it implies. / **The payment.** Charged only on a signed receipt. Settled in one close.
- Stack caption: Every value here comes from one recorded run. The motion is illustrative.

Shift
- H2: **Where does advertising go when the answer is a conversation?**
- Body: People now ask AI apps which wallet to buy, which tool to trust and what to do next. Those are moments of decision. Advertisers want to be there, and people deserve to know when they are. AI apps need a placement that sits beside the answer, never inside it, bought by agents that have to justify the fit.
- For the person asking: An answer that stays independent, and a card that says Sponsored.
- For the advertiser: An agent that bids only where your product fits, inside limits you set.
- For the AI app: Revenue for every card it actually delivers.

Roles
- H2: **Six parties. One rule: agents advise, code decides the money.**
- Advertiser: Sets the approved creative, what the product can do, who it is for, a maximum bid and a budget.
- Buying agent: Reads one opportunity with its own campaign and permitted evidence. Says bid, skip or abstain. Never sees money.
- Exchange: Checks eligibility in code, turns judgment into a bounded bid, runs a first price auction and reserves budget.
- AI app: Shows a separate card marked Sponsored, signs a receipt and gets paid.
- Person asking: Gets an organic answer from an assistant that never saw the ad.
- Payment worker: Authorizes only accepted charges. Browsers and agents never sign.

Stage
- H2: **What happens between the question and the card?**
- Lede: One real opportunity from our run, step by step. Values are actual. Motion is illustrative.
1. **The app offers a moment.** The publisher sends the task and what a product must be able to do. Here, store crypto.
2. **Eligibility is decided in code.** A campaign without a required capability cannot enter the auction, whatever it would pay. LeatherGuard sells a leather wallet. It was ruled out.
3. **Each agent gets its own evidence.** ContextHint supplies real past prompts, the ads they drew and an inferred audience, aligned to one advertiser. No rival bids, no budgets, no wallets.
4. **Agents judge the fit.** Each agent returns bid, skip or abstain, with relevance and intent levels. With history, both wallet agents rated intent 3 instead of 2. Asked anyway, for comparison, LeatherGuard's agent said skip.
5. **Code sets the price.** Policy turns those levels into a bid, capped at the advertiser's maximum. Two bids of 0.004 tied. A fixed rule chose ClearVault and reserved its budget.
6. **Delivered, disclosed, signed.** The app shows the card beside the answer, labelled Sponsored, and signs a receipt. Only now is there a charge: 0.004 USDC.
7. **Settled once.** ClearVault's voucher rose from 0.004 to 0.007 over two cards. One close paid the publisher 0.007 and returned 0.013.
- Exit: **Agents advise. Code decides the money.**

Payments
- H2: **Pay for each delivery without a transaction for each ad.**
- Body: An advertiser opens a stablecoin payment channel with a deposit. Each accepted card raises one signed voucher for the running total, off chain. A single close pays the publisher and returns what was not spent. One transfer per ad would put a network fee and a wait on every card. A channel keeps both out of the auction.
- Caption: ClearVault's actual channel. Hosted Solana sandbox, test USDC.

ContextHint
- H2: **What does an advertiser's agent know?** H3: **Built on ContextHint.**
- Lede: ContextHint is our conversational ad intelligence product, already used by thousands of people, including paying customers. It records ads shown inside ChatGPT, the prompts that drew them and an inferred view of who each ad is after.
- Stats: 11,730 observed advertisers / 45,947 unique ad creatives / 420,540 observed ad placements / 983 niches, 970 with ads / 7,121 sub niches, 5,991 with ads
- Source: ContextHint library snapshot, September 26, 2026. Placements observed June 19 to August 24.
- Dive caption: **One niche. One record. One agent.**
- Funnel H3: **Three numbers, kept apart.** The library: what ContextHint has observed. / The screened slice: 1,178 associations, 241 prompts, 537 creatives, 331 hints. What this MVP could draw on. / One packet: one example and one hint. What one agent saw for one question.
- Moat line: An auction is code. A record of which ads appeared beside which questions has to be collected. ContextHint already collects it.
- Context note: The library leans to the United States: 330,777 of 420,540 placements are US tagged and 67,430 have no country recorded. Fresh Ads now collects in 12 countries. Inferred audiences are hypotheses, not advertiser settings. Observed brands are not AXP advertisers. We do not reproduce any platform's ad ranking and claim no targeting lift.
- Action: **Visit ContextHint** (https://contexthint.com)

Principles
- H2: **Rules the money cannot break.** Lede: Each one held in the recorded run.
1. Agents advise. Code decides the money. / Agents returned levels and a creative. Policy set all three prices.
2. An award is not a charge. / Three awards became charges only after three signed receipts.
3. Losing bids cost nothing. / KeyForge lost two ties and paid nothing for them.
4. Disclosure, always. / Every delivered card carried the Sponsored label, checked in the browser.
5. Ads never rewrite the answer. / Four organic answers came from assistants given no advertiser material.
6. Money cannot buy past eligibility. / A mobile only request: all three campaigns ruled out in code, zero model calls, no ad.
7. A restart cannot double charge. / Four turns and three receipts replayed: zero new calls, charges or signatures.

Proof
- H2: **Does it actually run?** H3: **One recorded run, end to end.**
- Lede: Four real questions through the whole exchange on a hosted Solana sandbox with test USDC. Fictional advertisers, real decisions, real settlement.
- Stat bar: 4 real questions / 15 agent decisions / 3 auctions and 1 no fill / 3 Sponsored cards with signed receipts / 0.010 USDC paid to the publisher / 0.030 USDC refunded
- RunSheet header: v3-wallet-acceptance / hosted Solana sandbox / test USDC / Recorded replay; footer manifest hash e34448fa...2152a.
- Exhibits: KeyForge's actual Sponsored card + its signed receipt (short hashes).
- Limits H3: **What this run does not show.** The advertisers are fictional. One disposable test payer funded both channels. Sandbox, not mainnet. One observation per agent setting is a demonstration, not a benchmark. A receipt proves the app delivered the card, not that a person looked. No conversions or targeting lift are claimed.

Video
- H2: **Watch the run.** Caption: Four minutes, silent, captioned. A recorded replay of the saved run. Nothing executes again.
- artifacts/v3/recording/axp-v3-four-minute-demo.mp4 is 1400x1352 (near square); VTT from walkthrough.srt; 10 chapter buttons. Swappable for the Present-mode cut later.

Now and next
- H2: **Working now. Building next.**
- Now: Campaigns with approved creative, capabilities, caps and budgets. Buying agents that bid, skip or abstain on evidence. Eligibility, bounded bids and a deterministic auction. Disclosed Sponsored cards with signed receipts. Receipt linked payment channels, settled with refunds. Replay that cannot double charge.
- Next (Planned mark): Campaign planning agents. A publisher SDK for any AI app. More categories. An x402 payment adapter. MCP tools for agents. Advertiser owned wallets. Devnet, then mainnet. Network fees. Viewability and fraud measurement.
- Tiles: **For advertisers:** Be there when people decide, with an agent that knows when to sit out. / **For AI apps:** Earn from disclosed cards without touching your answers. / **For agent builders:** Bring your own buying agent. The exchange keeps it honest. (Planned)

Closing: **Disclosed. Decided in code. Paid on delivery.** See the exchange run, end to end. Actions: See the working MVP / Watch the video / Explore ContextHint

Footer: Hackathon MVP, October 2026. Hosted Solana sandbox, test USDC. ClearVault, KeyForge and LeatherGuard are fictional. ContextHint figures are from an owner supplied library snapshot dated September 26, 2026.

## Data contract
- scripts/extract-specimens.mjs reads ONLY artifacts/v3/replay/run.json + manifest.json, writes src/data/run.generated.json:
  questions + scenarios, organic answer excerpts (first two sentences of cached + repeat), the two approvedText
  creatives, bids/rejections/award per turn, the 15 decisions (decision, levels, arm; NO conversion field),
  cached ClearVault retrieval (prompt, creative, hint 88501, method, similarity) + offline lexical-fallback note,
  three receipts joined by awardId (short hashes, truncated signature), both channels (base units, short ids),
  restart counts, manifest hash. Never read sandbox-topup.json, agent ids, rpc, payee.
  Assert: 4000+3000+3000=10000; 40000-10000=30000; payout+refund=deposit per channel; fail build otherwise.
- src/data/library.ts: owner ContextHint figures + snapshot date + source string (hand-written, cited).
- src/data/copy.ts: all copy; scripts/lint-copy.mjs fails on em/en dashes and forbidden terms
  (partner, first, lift, conversion, viewab, attention, mainnet outside limits/next, x402 outside Planned, sub-50,
  "ChatGPT algorithm"); negation lines may carry `// claim-ok`.

## Prospectus primitives (design-system/prospectus)
Words, Display, Section(tone paper|paper2|stage), Opener(question-led), SplitGrid(.86/1.14|.74/1.26), Figure(title,
kinds, caption, Pause/Replay), Exhibit(label, kinds, tilt), BigStat/StatGrid, ActionPrimary (square ink, >=50px, wide
arrow gap) / ActionText (underlined), SourceNote, RoleRail, PrincipleLedger, NowNext, AudienceTile, ProvenanceLegend,
SiteHeader, SiteFooter, VideoFigure. Scenes in apps/marketing/src/scenes: HeroStack, Shutter, ExchangeStage,
ChannelMeterScene, LibraryDive, RunSheet, ClosingStack.

## Budgets and meta
JS <=170KB gzip; LCP = H1 text (<1.8s desktop, <2.5s mobile); CLS <0.02; Lighthouse perf >=90 desktop / >=80 mobile,
a11y 100. Preload SlimWide + Neutral fonts. Title "AXP.one: the advertising exchange for the agentic internet";
OG 1200x630 via ?still=1; favicon; robots noindex until the owner approves the deploy; no analytics.
NEXT_PUBLIC_MVP_URL defaults to /mvp/ (fallback #video).
