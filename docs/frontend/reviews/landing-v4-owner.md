# Owner priorities for landing v4 (2026-10-02)

Owner: "ContextHint's data moat should be highlighted, and we have to link back to contexthint.com. That was the main thing."

Current v3 state: the section exists ("What does an advertiser's agent know? Built on ContextHint.", stats, Library Dive)
but contexthint.com is linked only twice and the moat is one section deep in the page. v4 must make it unmissable:

1. **Hero**: a visible "Built on ContextHint's ad intelligence" line/badge near the primary actions, in ContextHint vermillion,
   linking to https://contexthint.com (opens in a new tab), so a judge sees the data foundation in the first 10 seconds.
2. **Header**: nav item "Data" becomes "ContextHint data" (anchor to the section); footer gets a ContextHint column/link.
3. **The ContextHint section becomes a headline chapter**, not a sub-section: its own opener with the moat thesis up top
   ("An auction is code. A record of which ads appeared beside which questions has to be collected. ContextHint already
   collects it."), the traction line (ContextHint's thousands of users and paying customers, framed as ContextHint's), the
   library numbers as big as the hero type, a prominent "Visit ContextHint" vermillion action, then the Library Dive and
   "Three numbers, kept apart". Keep the US-heavy and hypothesis notes with the data, not leading.
4. **Thread it through the story**: the exploded-card Evidence plate and the stage beat 3 name ContextHint and link to the
   section; Proof mentions the screened ContextHint slice the run drew on; the closing has a third action "Explore ContextHint".
5. Links to contexthint.com: at least hero, ContextHint chapter (twice: text link + action), closing, footer. All
   `target="_blank" rel="noopener"`.
6. Keep every truth rule: ContextHint traction is ContextHint's, library counts are not AXP enrollment, no algorithm
   replication or lift claims.

## Owner: "ContextHint is the foundation; in a hackathon code alone doesn't stick. Show the statistics." (2026-10-02)

Owner-supplied numbers from the ContextHint serving database (akshatapp). Put them in `apps/marketing/src/data/library.ts`
with source strings; render from there only. Headline (unchanged, snapshot Sep 26, 2026): 11,730 advertisers;
45,947 unique ads; 420,540 ad placements (times an ad was seen); 983 niches (970 with ads); 7,121 sub-niches (5,991 with ads).

Fresh Ads collection by country (live collection in 12 countries; "calls" = collection requests to the answers provider,
"returned ads" = calls whose answer carried at least one ad). Label: "Fresh Ads collection by country, ContextHint
serving database, owner-supplied." Do not add these to the 420,540 placements.

| Country | Calls | Calls that returned ads |
|---|---|---|
| United States | 311 | 207 |
| India | 230 | 112 |
| Canada | 133 | 86 |
| Germany | 133 | 88 |
| Japan | 130 | 83 |
| Australia | 116 | 55 |
| United Kingdom | 105 | 70 |
| Brazil | 102 | 65 |
| South Korea | 99 | 52 |
| Mexico | 97 | 56 |
| France | 84 | 52 |
| New Zealand | 75 | 26 |

Library by country (placements / ads): US 330,777 / 23,600; untagged (no country recorded) 67,430 / 26,893;
Australia 16,944 / 1,745; South Korea 5,373 / 332; India, Switzerland, Bangladesh a handful each.
Ads by country overlap and are not additive; never sum them.

Design: make this a data-rich, beautiful ContextHint chapter: the headline numbers huge; a 12-country Fresh Ads
coverage visual (e.g. a ranked bar/dot chart or a stylised world strip, calls vs calls with ads, hit rate shown);
the library-by-country breakdown as an honest bar showing US-heavy coverage (this IS the US-heavy note, presented as data,
not an apology). ContextHint vermillion is this chapter's colour. Then the Library Dive and "Three numbers, kept apart".
Never call these AXP advertisers, AXP traffic or AXP reach.

## Owner: "This needs to be presented visually and creatively to the judges." (2026-10-02)

The ContextHint chapter is the second signature moment of the page (after the hero). Build it as a pinned,
scroll-driven scene with its own visual language in ContextHint vermillion on paper. Every number from library.ts.
Suggested choreography (builder may improve, must stay honest):

1. **"420,540 times an ad was seen."** A dense dot field: one dot = 100 placements (4,205 dots). On scroll the dots
   sort themselves into country bands sized by real placements: US 3,308 dots, untagged 674, Australia 169,
   South Korea 54, others a handful. The US-heavy fact becomes the visual itself. Caption with the source.
2. **"11,730 advertisers. 45,947 ads."** A wall of REAL observed ChatGPT ad cards (reuse the ContextHint craft:
   /Users/akshat/ch-home-v4/src/components/home/v4/Wall.tsx + its real-ads data in that repo). Copy a small set of
   ad images into apps/marketing/public (no hot-linking: zero off-origin requests). Label on the wall:
   "Ads observed by ContextHint inside ChatGPT. Not axp.one advertisers." The numbers sit huge over the wall.
3. **"983 niches. 7,121 sub-niches."** The existing niche field, with a zoom into one niche splitting into its
   sub-niche grid (the run's crypto hardware wallet niche), then the existing Library Dive into the one record.
4. **"Collecting in 12 countries."** A ranked 12-row chart: calls (outline bar) vs calls that returned ads (vermillion
   fill), hit rate in tabular figures (e.g. US 207 of 311, 67%). Bars fill as you scroll. Small flags are NOT allowed
   (no icon sets); use country names.
5. **"Three numbers, kept apart."** Funnel: the library (420,540 placements) -> the screened slice this MVP used
   (1,178 associations) -> one packet (1 example + 1 hint), narrowing visually, vermillion turning into ultramarine
   at the packet as it enters the agent.
6. Close the chapter with the moat line at display size and the vermillion **Visit ContextHint** action.
Reduced motion and <900px: the same content as static charts. Keep "Planned" and truth labels intact.

## Owner traction line (2026-10-02, supersedes the earlier "thousands of people" wording)
ContextHint has **more than a thousand users and marketers using it every day**, including paying customers.
Use exactly that claim (ContextHint's traction, owner-supplied, not axp.one's). Suggested copy:
"More than a thousand marketers use ContextHint every day, including paying customers."
Show it prominently: in the hero ContextHint badge line and as a big figure in the ContextHint chapter
("1,000+ marketers every day"), next to the library numbers. Keep it in library.ts with the source "owner-supplied".
No invented counts beyond this, no revenue, no customer names.

## Owner: no internal details on the landing page (2026-10-02, standing rule)
"Landing pages don't need internal details. Small tags with IDs don't look good on a landing page."
- Remove from the landing page entirely: record IDs (ads:mapping:..., ads:hint:...), hashes, policy names
  (fit_intent_bid_v1), model version strings (jev-1.13.0, gpt-6.1-sol), level shorthands (R3 I3), run IDs,
  "legacy ID" notes, base units, lamports, campaign-ID wording for the tie rule (say "a fixed tie rule").
- Provenance: keep it human and sparse. At most one quiet source line per figure/scene (e.g. "Values from our recorded
  run. Motion is illustrative."), not a chip on every element. The 10-glyph legend goes (it lives in the MVP).
- All of that detail belongs in the MVP (the Ledger explorer, inspector, Verify). The landing links there.

## Owner: highlight Jev more (2026-10-02)
"Jev needs to be highlighted more: it's the decision API we're using, it's good for marketing."
Jev (by TypeSafe) is the decision API behind every advertiser agent's judgment. Give it a clear, proud moment:
- In the stage beat "Agents judge the fit" and the exploded-card "Agents" plate: "Judged by Jev" as the named engine.
- A dedicated short feature block (paper, ultramarine): "Every bid starts as a Jev decision." Jev returns typed
  judgments for each opportunity: how relevant it is, how strong the buying intent is, and which approved creative fits,
  with its own confidence. axp.one turns those judgments into a bounded bid in code; Jev never sees money.
  Real numbers from the run only: 15 Jev decisions, each returned in under a second (recorded 315 to 846 ms; say
  "under a second", no speed-advantage claims), bid or skip on every one, LeatherGuard's skip included.
- Name it "Jev by TypeSafe" and link https://docs.typesafe.ai (new tab). No partnership/endorsement claim beyond
  "built with Jev". Keep it replaceable framing implicit (don't call it the only or optimal model).

### Jev: owner clarification (2026-10-02, supersedes the block above where they differ)
Not a sponsor. Keep it modest: "Built with Jev" only where it is relevant, no dedicated feature block, no hero mention.
Places: the "Agents judge the fit" stage beat and the exploded-card Agents plate ("judged with Jev"), plus one line in
the footer/credits ("Agent decisions built with Jev by TypeSafe", linking https://docs.typesafe.ai). Nothing more.

## Owner: three things to highlight (2026-10-02, Solana track)
We are entering the Solana track. Highlight three components, as the three pillars of axp.one (no sponsorship wording):
1. **ContextHint**: the data foundation (the chapter above).
2. **Solana payment channels**: how money moves. Name Solana clearly wherever payments appear: the payments band
   becomes "Settled through Solana payment channels": a deposit opens a channel on Solana, each accepted card raises
   a cumulative off-chain authorization, one close on Solana pays the AI app and refunds the rest. Real facts only:
   2 channels opened and closed on a hosted Solana sandbox with test USDC, both finalized, 0.010 paid, 0.030 refunded,
   no Solana transaction per ad. Never claim mainnet. Stage beat 7 and the exploded-card Payment plate say "Solana".
3. **Jev**: the agent decisions ("judged with Jev"), kept proportionate.
Add one clean "Built on" trio, placed once near the top (under the hero or right after it), plain text, no logos,
no icon sets: "Data from ContextHint. Decisions with Jev. Settlement on Solana." Each item one short line with a link
(contexthint.com, docs.typesafe.ai, solana.com), opening in a new tab. Then each pillar appears again where its part
of the story happens. This supersedes "Jev only in footer": Jev may sit in the trio too, still modest.
