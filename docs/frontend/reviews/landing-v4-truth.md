# axp.one landing v4: truth audit

Scope: tag `axp-landing-v4` (3fe09a2). The working tree has no diff vs the tag under `apps/marketing` or
`design-system/prospectus`. The dev server on :3410 renders the tagged source. The stripped body text of
`out/index.html` (built 01:12) is identical to the live :3410 render.

Audited:
- Source: `apps/marketing/src/**` (new: `chapter/*`, `data/library.ts`), `design-system/prospectus/**`, `scripts/lint-copy.mjs`.
- Rendered text, meta/OG, alt, aria-label and title of `http://localhost:3410/` and `/design/` (curl, scripts and styles stripped). Raw HTML and built JS chunks were checked for internal identifiers.
- Ground truth: `artifacts/v3/replay/run.json` + `manifest.json`, `src/data/run.generated.json`, `docs/frontend/reviews/landing-v4-owner.md` (owner figures), `docs/build/V3_RESULT.md`, and `/Users/akshat/ch-home-v4/src/lib/home-real-ads.ts` + `public/home/ads/**` (the source for the observed-ads wall).

Tooling:
- `node apps/marketing/scripts/lint-copy.mjs`: passes. 51 files are clean, plus `out/index.html` and `out/design/index.html`. The lint now also checks the built landing for internal-detail patterns.
- `extract-specimens.mjs` asserts all passed. It rewrote `run.generated.json` with no git diff.

Summary: **1 blocker, 13 warnings.** Every number on `/` traces to the run or to the owner figures (table at the end). All 12 hit rates are computed and rounded correctly. Dot counts per band equal round(placements / 100) and add up to 4,205. No ID, hash, policy name, model version, level shorthand, run ID, base unit or lamport appears in the landing's rendered text, meta or attributes. No em or en dash appears. No partnership, sponsorship, mainnet, lift or replication claim appears outside a negation, a limit or the Planned list.

### Predecessor (v3) blockers: all fixed
| v3 | Status | Evidence |
|---|---|---|
| B1 Evidence plate unlabelled | Fixed | `plates.tsx:102` renders `HERO.brandNote` "Observed historical reference, not an axp.one advertiser." The cut is marked with an ellipsis ("New Electronics" becomes "New…"). |
| B2 Only the changed outcome shown | Fixed | Beat 4: "On the second question, history changed nothing." The payoff shows changed and unchanged at equal weight, plus "Each setting ran once: a demonstration, not a benchmark." |
| B3 "tie rule picked the winners" | Fixed | "a fixed tie rule settled both ties" (`copy.ts:129`). |
| B4 Provenance reversed | Fixed | "This exact question is in ContextHint's recorded prompts, so the lookup found a perfect match." |

v3 warnings also fixed: W2 (ContextHint users are not axp.one users), W3, W4 (operator bridge limit), W5/W6 (motion marked illustrative), W7 ("Answer, excerpt"), W9, W10, W11, W13 (lint covers `/design/` and runs on a fresh build), and the og.png 404 (`public/og.png` is now 1200x630). W12 (MVP link) and part of W14 carry over (see below).

---

## BLOCKERS

### B1. The observed-ads wall sits beside "including paying customers" with only a "not axp.one advertisers" label, which implies these brands are ContextHint customers
- **Where:** `chapter/ContextHintChapter.tsx:21-52`, `chapter/chapter.css:8-20`. At 1000px and wider, the left column ends with the traction figure "1,000+ / marketers use ContextHint every day, including paying customers". The right column holds a wall of 18 real brand cards with their logos: Canva, Salesforce, Mastercard, Fidelity, Robinhood, CrowdStrike and others. Below 1000px the wall comes directly after the traction line.
- **Why it fails:** this is the standard "trusted by" layout, a customer-logo wall next to a customer claim. The label under the wall (14px, muted) is `Ads observed by ContextHint inside ChatGPT. Not axp.one advertisers.` It rules out an axp.one relationship but not a ContextHint one. Nothing supports any relationship between these brands and ContextHint, and the brief requires "no implied relationship". The wall is `aria-hidden`, so the label is the only disclosure.
- **Fix (copy only):** set `CONTEXTHINT.wallLabel` to `Ads observed by ContextHint inside ChatGPT, shown as data. These brands are not axp.one advertisers, and no relationship with them is implied.` Optionally also move the traction block below the Library numbers or the dot bands, so it no longer sits next to the logos.

---

## WARNINGS

Ordered by risk.

1. **"A call ... counts when the answer carried at least one ad" reads as if calls without ads are not counted.** `copy.ts:161` (`countriesBody`). The chart's "Calls" column counts every call. Suggest: `A call is one collection request. It returned ads when the answer carried at least one ad.`
2. **The footer dates every ContextHint figure to the September 26 snapshot.** `copy.ts:286` says "ContextHint figures are from an owner supplied snapshot dated September 26, 2026." The 1,000+ traction line was supplied on 2026-10-02, and the Fresh Ads table has no date or window. Suggest: `ContextHint library figures: owner supplied snapshot, September 26, 2026. Traction and Fresh Ads figures: owner supplied, October 2026.`
3. **"One of them is the niche our run drew on" (singular).** `copy.ts:157`. The screened slice drew on five niches (`run.manifest.selection.niches`: crypto hardware wallets, crypto investing, web3 infrastructure, crypto tax, privacy-preserving blockchains). LeatherGuard's evidence came from other prompts, for example "best wallet for privacy preserving blockchains". Crypto hardware wallets is the niche of the one record in the story (`probeNiche` of mapping 1836866). Suggest: `One of them is the niche of the record in our story: crypto hardware wallets and self custody.`
4. **"0.030 refunded to the advertiser".** `copy.ts:310` (Payments facts). The refunds went to one disposable test payer that funded both channels (`chainEvidence.channels[].payerRefundBaseUnits`, the same `payer` key on both channels). The Proof limits say so. The singular "the advertiser" also conflicts with the two channels. Suggest `refunded to the payer`, or plain `refunded` as in Proof.
5. **The per-ad lane is an unlabelled counterfactual, and "network fee" has two meanings on the page.** `copy.ts:314-315` and `page.tsx:114-131`. "A transaction for each ad / A network fee and a wait on every card", with three ticks, is a hypothetical comparison with no Illustrative mark. Earlier, "Why now" uses "A network fee on settled spend" for axp.one's Planned revenue. Suggest `perAdNote: "Illustrative: a Solana transaction fee and a wait on every card."` so it cannot be read as the planned fee or a recorded cost.
6. **MVP links still 404 at the landing origin.** Every "See the MVP" / "Open the MVP" link goes to `/mvp/`, and "Verify the receipts" goes to `/mvp/verify/`. `curl :3410/mvp/` returns 404. `apps/product-ui` supports `NEXT_PUBLIC_BASE_PATH`, but no repo script merges it under `/mvp/`. The receipt note "Every signature and hash checks in your browser on the MVP's Verify page" depends on this link. Set the combine step before deploy. (Carried over from v3 W12.)
7. **Internal details ship to every visitor in client JS, and the lab pages deploy.** The landing loads `_next/static/chunks/585-*.js`, which embeds the run slice: `jev-1.13.0` x16, `fit_intent_bid_v1` x6, the manifest hash and receipt hashes. This is not rendered, but anyone can see it in DevTools. `public/color-lab/` and `public/metal-lab/` are copied into `out/`, so they deploy at `axp.one/color-lab/` and `/metal-lab/`, and `metal-lab` contains `fit_intent_bid_v1`. Suggest a slimmed client slice (or server-only imports) and excluding `public/*-lab` from the deploy.
8. **`/design/` still shows internal details and one mislabelled mark.** It is noindex and unlinked from `/`, but it is served. It renders the run ID `v3-wallet-acceptance` (`design/page.tsx:116`), a receipt hash `cdf946cc...5712b` (`:143`) and the title tooltip "4000 base units (6 decimals)". The Channel meter's first three frames still carry the "Actual output" mark (`:262`, defined as "A real model or app-agent response"). Use Settled or money-state marks, or exclude `/design/` from the public deploy.
9. **The Funnel bars are not to scale and are unmarked.** `chapter/Funnel.tsx:6` uses widths 100 / 58 / 24 for 420,540 / 1,178 / 1 + 1. The values are correct, but a bar chart implies proportion. Add `Not to scale.` under "Three numbers, kept apart."
10. **The Payment plate shows deposit, refund and "This card" with nothing between them.** `plates.tsx:109-112`: Deposit 0.020, Refunded 0.013, This card 0.004. 0.020 minus 0.013 is 0.007 (two cards), not 0.004. The aria-label is correct ("paid 0.007"). Suggest adding the visible line `Paid 0.007 for two cards`.
11. **"On the cached question" is internal jargon.** `copy.ts:176`. It is not on the owner's banned list, but "cached" is a pipeline term. Suggest `On the first question`, or `On the question with an exact match`.
12. **"Four real questions" / "4 real questions".** `copy.ts:197, 199`. Only the cached question comes from ContextHint's recorded prompts. The offline, repeat and mobile-only prompts were written for the run. The questions are real inputs to a real run, but a reader may take "real" to mean asked by real people. Suggest `Four questions`.
13. **Wall source naming (informational).** `observedAds.ts` says the ads come from "ContextHint's library". The source file it copies (`ch-home-v4/src/lib/home-real-ads.ts`) says "captured by the ChatGPT Ad Library (chatgptadlibrary.com)". Both draw on the same serving corpus, so "observed by ContextHint" is defensible. Confirm with the owner if a judge might ask. Separately, the sandbox is a hosted fork whose channels use the mainnet USDC mint address and mainnet genesis hash. "Hosted Solana sandbox, test USDC" and "Sandbox, not mainnet" are both accurate. Be ready to explain this if someone opens the explorer links in the MVP.

Checked and clean:
- **Wall:** all 18 ads match the source title and body byte for byte. All 36 images (creatives and logos) are byte-identical copies in `public/observed-ads/`. The landing makes zero off-origin requests: the only absolute URLs are the `<a>` links to contexthint.com (x7), docs.typesafe.ai (x2) and solana.com (x2), all `target="_blank" rel="noopener noreferrer"`. The wall images use `alt=""` inside an `aria-hidden` wall (decorative). No counts, rates or outcomes are attached to any brand.
- **ContextHint traction:** "More than a thousand marketers use ContextHint every day, including paying customers." appears in the hero badge, and "1,000+ / marketers use ContextHint every day, including paying customers" in the chapter. This is the owner's suggested copy, sourced in `library.ts` as owner-supplied. No other count, revenue or customer name appears. The context note says ContextHint's users are not axp.one users.
- **Library numbers:** never called axp.one advertisers, traffic or reach. Per-country ads (which overlap) are not rendered and never summed. Fresh Ads is labelled "Not part of the 420,540 placements."
- **Solana:** "hosted Solana sandbox with test USDC" appears in the status line, Proof, Payments source and footer. The page states 2 channels opened and closed, both finalized; 0.010 paid; 0.030 refunded; "no Solana transaction for each ad"; and "Sandbox, not mainnet." Mainnet appears only in that limit and in "Devnet, then mainnet." under Planned.
- **Jev:** "judged with Jev" (plate and stage), "Agents judge the fit, with Jev", "Decisions with Jev" (Built on), and "Agent decisions built with Jev by TypeSafe" (footer). There is no partnership, sponsor, endorsement, speed or optimality claim, and no ms timings. All 15 decisions are Jev calls (`callEvidence[].packet.model` = jev).
- **Why now fee:** "A network fee on settled spend." carries the visible "Planned, not in this demo" mark (`page.tsx:55`).
- **No internal details on `/`:** rendered text, attributes and raw HTML contain no `ads:mapping`, `ads:hint`, `fit_intent`, `jev-1`, `gpt-6`, R/I shorthand, hex hashes, base58 signatures, `v3-*` IDs, base units, lamports, "legacy" or campaign-ID wording. The receipt exhibit shows only signer, card, question, mode and charge.

---

## VERIFIED: every number shown on `/`

`run` = `artifacts/v3/replay/run.json`; `st` = `run.state`; `gen` = `src/data/run.generated.json`; `owner` = `landing-v4-owner.md`, mirrored in `src/data/library.ts`.

| Shown | Value | Source / check |
|---|---|---|
| Headline library | 11,730 advertisers; 45,947 unique ads; 420,540 placements; 983 niches (970 with ads); 7,121 sub niches (5,991 with ads) | owner headline; `LIBRARY` |
| Snapshot, window | September 26, 2026; June 19 to August 24 | owner; `LIBRARY.snapshotDate`, `placementsWindow` |
| Traction | 1,000+ / "More than a thousand marketers use ContextHint every day, including paying customers." | owner traction line (2026-10-02); `TRACTION` |
| Library by country | US 330,777; no country 67,430; Australia 16,944; South Korea 5,373; India, Switzerland, Bangladesh "a handful each" | owner; the four bands sum to 420,524, leaving 16 for the three handfuls |
| Dots per band | US 3,308; no country 674; Australia 169; South Korea 54; total 4,205 | `Math.round(p/100)`: 3307.77, 674.30, 169.44, 53.73 round to 3308, 674, 169, 54; the sum 4,205 = round(420,540/100); matches the owner's suggested counts; aria-label "420,540 placements as 4,205 squares" |
| US share | "leans hard to the United States" | 330,777 / 420,540 = 78.7% |
| Fresh Ads (with ads / calls, hit rate) | US 207/311 67%; India 112/230 49%; Canada 86/133 65%; Germany 88/133 66%; Japan 83/130 64%; Australia 55/116 47%; UK 70/105 67%; Brazil 65/102 64%; South Korea 52/99 53%; Mexico 56/97 58%; France 52/84 62%; New Zealand 26/75 35% | owner table, row for row. `Math.round`: 66.56, 48.70, 64.66, 66.17, 63.85, 47.41, 66.67, 63.73, 52.53, 57.73, 61.90, 34.67 round to the rendered values. Bars: outline = calls/311, fill = with ads/311 (same scale). Ranked by calls; Canada and Germany tie at 133 |
| Fresh Ads countries | 12 | owner; `FRESH_ADS.rows.length` = 12 = `LIBRARY.freshAdsCountries` |
| Screened slice | 1,178 records; 241 prompts; 537 ads; 331 inferred audiences | `run.manifest.counts.{associations,normalizedPrompts,creatives,hints}` = `gen.evidence.slice` |
| One packet | 1 + 1 | `gen.evidence.{examples,hints}` = 1, 1 |
| Mercari text | verbatim, incl. "Paid $55" | `run.evidence.records[1836866].creativeText` |
| Cached bids, tie, winner | 0.004 x2, fixed tie rule, ClearVault | `st.turns[v3-cached].outcome` (2 bids of 4000) |
| Intent with/without history | 2 became 3 (both wallet agents, cached); second question unchanged | `callEvidence` q0: CV 2 to 3 (2.38 to 2.52), KF 2 to 3 (2.29 to 2.50); q1: all intent 2 in both arms |
| LeatherGuard | ruled out in code; asked anyway: skip; evidence matched leather wallets | `eligibility.excluded` missing_constraint; LG decisions = skip x5; LG packet: Ariat bifold, Yoder Leather RFID card wallet, Horween leather bifold |
| Charge | 0.004 after receipt | award/charge 4000 |
| ClearVault channel | deposit 0.020; authorized 0.004 then 0.007; paid 0.007; refunded 0.013 | `st.payments[CV]`: deposit 20000, vouchers 4000/7000, settled 7000, refund 13000 |
| Channels | 2 opened and closed, both finalized | `gen.counts.channels` 2; `st.payments[].openStatus` and `closeStatus` = finalized; `chainEvidence` confirmationStatus finalized |
| Totals | 0.010 paid; 0.030 refunded | `gen.totals` paid 10000, refunded 30000 |
| No transaction per ad | 3 accepted cards, 1 open + 1 close per channel | `st.payments[].vouchers` (2 + 1) are off-chain; on-chain only `open`/`close` |
| Rule wall | 3 awards / 3 receipts; KeyForge lost 2 ties; 4 answers with no advertiser material; mobile: all 3 ruled out, 0 calls; replay: 0 new calls, charges, signatures | `gen.counts` (receipts 3, ties 2, organicAnswers 4); `st.turns[v3-mobile]` excluded 3, records 0; `gen.restart` all 0, sameStateHash |
| Proof stats | 4 questions, 15 decisions, 3 auctions, 1 no fill, 3 receipts | `gen.counts` |
| Run sheet | offline 0.003 x2, ClearVault won; repeat KeyForge 0.003, "ClearVault: had already been shown twice" | `st.turns[v3-offline/v3-repeat].outcome`; frequencyCap 2 in `st.freeze`; CV won cached + offline, both completed before repeat |
| Story vs run order | no fill ran first | `st.turns[v3-mobile].completedAt` is the earliest |
| Jev | 15 decisions, every one Jev | `callEvidence` length 15, each packet model jev |
| Video | four minutes; chapters 0:00 to 3:30 | unchanged from v3 (MP4 240.0 s; 10 cues) |
| Dates | "Recorded run, October 2026"; "Hackathon MVP, October 2026" | `manifest.createdAt` 2026-10-01 |
