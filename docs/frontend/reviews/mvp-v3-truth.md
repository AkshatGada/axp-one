# MVP v3 truth audit (changes only: axp-mvp-v2 → axp-mvp-v3)

- **Auditor:** truth reviewer, read-only.
- **Date:** 2026-10-02.
- **Tag:** `axp-mvp-v3` is f15a725, which is HEAD of `frontend`. There are no working-tree changes under `apps/product-ui` or `design-system/ledger`.

## Scope

- **Diff:** `git diff axp-mvp-v2 axp-mvp-v3 -- apps/product-ui design-system/ledger`, 30 files.
- **Ground truth:**
  - `mvp-v2-truth.md`
  - the MVP_SPEC traps
  - `artifacts/v3/replay/run.json`
  - `docs/build/V3_RESULT.md`
  - `src/data/run.public.json`
- **Rendering:** the dev server on :3420 returns 500 for `/`, `/opportunity/*` and `/verify/`; `/settlement/` returns 200. `.next` was modified at 02:00, after the server started at 01:09. That matches the documented collision from running build while dev is up. Rendered-text checks were therefore limited, and the changed pages were judged from source.

## Tests and probes

`pnpm --dir apps/product-ui test`: **20/20 pass.** This includes the 2 new tests that an empty or truncated PEM is a FAIL.

I ran my own probes of `verifyChecks` (scratch only, not added to the suite):

| Probe | Result |
|---|---|
| Different valid Ed25519 key | 45/48, 3 fail ("signature does not match"), 0 skip |
| P-256 key | 3 fail ("publisher key unreadable: Invalid key type"), 0 skip |
| Garbage PEM | 3 fail, 0 skip |
| Delete opp 1 receipt | **43/43, 0 fail** (checks vanish) |
| Set `tieBreakApplied=false` | **46/46, 0 fail** |
| Drop opportunity 4 | **47/47, 0 fail** |
| Drop a channel | 2 fail |
| Change a decision level | 48/48. Disclosed: no check covers it. |
| Change evidence record text | 48/48. Disclosed: no check covers it. |

`/verify/` handles the vanishing checks correctly. Its rows are laid out at build time (48), and any missing result shows "n not checked" in danger tone, never "Passing". The Overview, Present and design tile does not handle them (B4).

Tamper demo (`VerifyRunner.tsx` `TamperDemo`):
- It never mutates the served file. It works on a `JSON.parse(JSON.stringify(run))` copy and makes no write or fetch.
- It genuinely recomputes: it runs the full `verifyChecks` on the copy, which recomputes the SHA-256 of the receipt and runs Ed25519 verification.
- Opp 1's nonce ends in "a", so it flips to "b".
- Both `receipt-1` and `signature-1` show FAIL with "Mismatch". Reset re-runs on a fresh copy.
- The copy text is accurate.

## BLOCKERS

### B1. "A rule changed the winner" is false
It appears in four places:
- **Overview callout title** (`src/app/(explorer)/page.tsx:42`): "Where a rule changed the winner: opportunity 3"
- **Opportunity 3 auction callout title** (`src/components/v2/stages.tsx:344`): "A rule changed the winner. Agent said bid. Exchange did not admit it."
- **TieExplainer** (`stages.tsx:299`): "For a rule that changes the winner, see opportunity 3."
- **Present beat 5** (`src/app/present/page.tsx:178`): "On opportunity 3 a rule, not a tie, decides the winner."

Why this is false:
- ClearVault had already spent 0.007 of its 0.008 cap. Opp 2 recorded `availableCampaignBaseUnits` 4000, and opp 2 then cost 3000.
- With the cap lifted, `computeBid` at 3:3 gives min(4000, 1000, 13000) = 1000, which is 0.001.
- KeyForge bid 3000, so KeyForge wins either way. The frequency cap kept a bidder out; it did not change the winner.
- The claim also implies something about the size of ClearVault's bid, which trap 4 forbids ("No amount").

Fix:
- Overview title: "Where a rule kept an agent out: opportunity 3".
- Auction callout: the exact trap-4 title "Agent said bid. Exchange did not admit it."
- TieExplainer: "For a frequency-cap exclusion, see opportunity 3."
- Present: "On opportunity 3 the frequency cap, not a tie, decides who may bid."

### B2. "For the research comparison every agent was asked" is false on opportunity 4
- **Location:** `stages.tsx:184` (EligibilityPanel caption) and `glossary.ts` `eligibility`.
- **Problem:** EligibilityPanel also renders on `/opportunity/4/`. There, 0 agents were asked, and the NoFill panel directly below it says "no agent was asked (0 calls)".
- **Fix:** "On opportunities 1 to 3 every agent was asked, even when excluded, for the research comparison. An excluded campaign can never bid. When no campaign is eligible, no agent is asked."
  - Or render the caption only when `o.decisions.length > 0`, and fix the glossary text the same way.

### B3. The Settlement fees callout misstates the rent and compares SOL with USDC
- **Location:** `src/app/(explorer)/settlement/page.tsx:457`. It renders on `/settlement/`.
- **"Most rent is reclaimed when a channel closes."** This is false for this run.
  - New rent was 9,423,840 lamports and reclaimed rent was 4,078,560, which is 43%.
  - V3_RESULT: "remaining channel rent 2672640 per channel" against 2,039,280 reclaimed per channel.
- **Title, "Why fees are larger than the ad spend here".** This compares test SOL with test USDC. The body of the same callout says the two are never mixed.
  - Numerically, 9,463,840 lamports is 0.0095 SOL against 0.010 USDC, so the title only holds at an assumed SOL price.
- **Fix:**
  - Title: "Fees and rent are separate from ad spend".
  - Body: "Part of the rent (2,039,280 of 4,711,920 lamports per channel) was reclaimed at close." Keep the per-voucher sentence.

### B4. `LiveVerifyTile` can show "Passing" below 48/48
- **Location:** `src/components/v2/live.tsx:42-54`. It is used on the Overview, Present beat 9 and `/design/`.
- **Problem:** The chip is "Passing" whenever every *returned* check passes. If you delete a field so that checks are never generated, it shows "Passing":
  - "43/43 Passing" with opp 1's receipt removed
  - "46/46" with the tie flag cleared
  - "47/47" with opportunity 4 dropped
- **Why it matters:** The owner's acceptance rule is "Passing only when 48/48".
- **Fix:** Compare against the expected count. Pass the build-time row count, or `buildMeta`'s count, into the tile, and show "Passing" only when `pass === expected && total === expected`. Otherwise show "n not checked" in danger tone. Add a structural-deletion tamper test.

### B5. Arm comparisons drop the mandatory "One observation per arm; not a measured lift"
- **TieExplainer, opp 1** (`stages.tsx:299`): "History made a real difference to the price: without it ClearVault's ratings gave 0.003 USDC; with it, 0.004 USDC."
- **Present callout "What history changed here"** (`present/page.tsx:177-179`): same comparison, with no disclaimer.

Why this is a blocker:
- Trap 3 and the design doc ("Every arm comparison ends with this sentence") require the disclaimer.
- "Real difference" is lift language about a 2.38→2.52 move across a rounding line, from one observation.
- The mechanical counterfactual itself (3:2 → 0.003, 3:3 → 0.004) is correct.

Fix: "With history the levels rose from 3 and 2 to 3 and 3, so the bid table gave 0.004 USDC instead of 0.003. One observation per arm; not a measured lift."

## WARNINGS

### W1. The tie rule is "published before the run" (glossary `tieRule`, TieExplainer, Present beat 5, Overview, SRT line 23)
- The frozen policy in run.json (`state.freeze.policy`) has **no** tie-break field.
- The rule lives in exchange code (`packages/exchange/index.mjs:92`, localeCompare) and in the pre-run design docs (EXCHANGE_COMPONENT_PACKET, SHARED_CONTRACT_PACKET).
- The `policy.tieBreak` string in the projection is added by `project-run.mjs:518`.
- Safer wording: "fixed in the exchange code before the run".

### W2. Verify-page details
- The "Recorded in the file" column shows the **build-time** expected values, not those of the file that was served. If the served file is altered, a row can show recorded equal to computed next to a fail mark. It still fails loudly.
- The KPI values render before anything runs, with JS off, and still show if checks fail:
  - "Hashes recomputed 28"
  - "Signatures checked 3"
- **Fix:** Label the KPIs as checks ("28 hash checks") or fill them after the run.

### W3. VerseOdin is named as a data source ("VerseOdin prompt panel", `/evidence/`)
- This names a real third-party company with no label, which could read as a partnership. Owner to confirm that naming it is intended.
- The lede also says the prompts come "from ContextHint's recorded prompt panel", but 1,031 of the 1,178 associations are labelled "Stored ad library". Align the two.

### W4. Glossary precision
- **`jev`:** "rates relevance and buying intent as levels from 0 to 3". Jev returns scores, and levels are `Math.round(score)`. Prefer "scores from 0 to 3, which are rounded to levels".
- Everything else checked is accurate and claims nothing forbidden:
  - `contexthint`
  - `solanaSandbox`: "not devnet or mainnet" appears only as a negation
  - `lamports`
  - `rent`: "some is reclaimed" is correct, unlike B3
  - `voucher`: "signed" is correct; the vouchers are Ed25519-signed by the payer, and the signatures are kept private
  - `channel`, `cosine`, `lexical`, `arm`

### W5. Verify's "Left out" list includes "the conversion field"
- Trap 10 is not breached, because no value is shown.
- The phrase invites a "conversion prediction" reading. Consider "a model output field the exchange does not use".

### W6. Present beat 9 tile context reads "Checks run in your browser on the public file"
- In the recorded video, the viewer's browser runs nothing. This is the same issue as v2 W9.
- The beat 7 caption "These checks run in your browser." is acceptable as a pointer to `/verify/`.

### W7. Carried over and not fixed
- v2 W10: `/timeline/` is still a 404; nothing links to it.
- v2 W13: `campaignVersionsCreatedAt` is still read from the laboratory events. The projection is outside this diff.
- v2 W14: beat 1 still says "Someone asks an AI app" for operator-authored scenarios.

## v2 blockers

| v2 | Status | Evidence |
|---|---|---|
| B1 Verify overstated "every hash" | **Fixed** | "every hash marked recomputable (questions, packets, creatives, acknowledgements, receipts) … Hashes marked recorded only are reported, not checked." The Inspector now says "Recorded hash only, not checked here". |
| B2 Unreadable key showed "unsupported" and "Passing" | **Fixed** for verify logic and `/verify/` | Known-good probe vector (`canonical.ts` `ed25519Supported`). Import failure returns `supported:true, ok:false` and the check is FAIL. 2 new tests pass, and my P-256 and garbage probes fail. The VerifyRunner headline is "Passing" only at 48/48 with no skip or missing check. `LiveSignatureV2` says "Signature invalid or key unreadable". **Residual:** the `LiveVerifyTile` count gap (new B4). |
| B3 Unlabelled real brands in neighbour rows | **Fixed** | Caption above the list: "Brands in this list are observed historical references, not axp.one advertisers." |
| B4 "Nothing here trusts the page" | **Fixed** | New sub uses the recommended wording. "Does not prove" adds that the file and the checker are not independent. |
| B5 Try page "the real stack" | **Fixed** | "runs locally as a synthetic laboratory, with model providers off by default". |

## v2 warnings

| v2 | Status | Evidence |
|---|---|---|
| W1 Equal weight | **Fixed** | Beat 5 and the SRT add "both arms stayed at level 2: unchanged". Present adds an opp 2 "Unchanged" panel. Both decision tags use `outline`. |
| W2 Sandbox qualifier | **Fixed** | Lede, `<title>`, advertisers, sequence lines and KPIs now say hosted Solana sandbox. |
| W3 Rubric footnote | **Fixed** | Packet Inspector note. The publisher Inspector keeps its legacy-ID note. |
| W4 Idle states read as verified | **Fixed** | "checking", "Not run yet", neutral Inspector tags, and `.catch` to fail. The static Overview "Verified" was removed. |
| W5 Charts mixed cap and deposit | **Fixed** | StepChart is scaled to the 0.020 deposit, with the 0.008 cap drawn as a line. The charge panel shows vouchers to date only. |
| W6 Uncovered displayed values | **Disclosed** | "Does not prove … that displayed scores and evidence text match them". |
| W7 Try skip attributed to the agent | **Fixed** | "the bid rule needs at least 2 and 2". This is accurate for Try's synthetic rule. |
| W8 "Leather wallets" | **Fixed** | "RFID-blocking wallets". |
| W9 Beat 7 "just ran in this browser" | **Fixed** | Caption and SRT: "These checks run in your browser"; receipt text: "runs in the browser showing this page". |
| W10 `/timeline/` | Not fixed | |
| W11 Sanitization chips | **Fixed** | Plain "Left out:" sentence. |
| W12 "Real prompts" | **Fixed** | Wording changed, but see W3. |
| W13 Laboratory read | Not fixed | Outside this diff. |
| W14 Receipt Mode and beat 1 | **Half fixed** | Mode now shows the raw `sandbox` field in mono. Beat 1 is unchanged. |

## Other checks on the changed copy

- **Units:**
  - USDC is now explicit on KPIs, tables and flow tiles.
  - Fees are in lamports, labelled test SOL, with the cap at 20,000,000.
  - Present's verify list (19 + 9 + 3 + 17 = 48) matches `verify.ts`.
- **Tie explainer facts:** "same capabilities, same 0.004 max, same ratings" is true on opp 1 (3:3/3:3) and on opp 2 (3:2/3:2). "History made no difference" is correct on opp 2.
- **Opp 3 callout body:** "placed twice", "KeyForge, the only admitted bidder, won at 0.003 USDC with ratings 3 and 2" and the absence of any amount for ClearVault all match the record. Only the title is wrong (B1).
- **Settlement clock handling:**
  - Slot-ordered list with no times.
  - The Inspector note says blockTime is the sandbox clock and not aligned. Trap 2 holds.
- **No-fill pipeline:** 3 stages, "Steps 3 to 9 did not run" and "0 of 3 may bid". This is correct.
- **Forbidden-claims sweep of added lines:**
  - mainnet and devnet appear only as negations.
  - None of these appear: lift (apart from the existing disclaimers), attention, partnership, ChatGPT/OpenAI, industry-first, x402.
  - "conversion" appears only as the removed field (W5).
