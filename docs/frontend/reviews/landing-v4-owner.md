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
