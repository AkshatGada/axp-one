# Advertiser onboarding and dashboard demo

## Launch

From `/Users/akshat/agentic-dsp`, run `npm run demo:advertiser` and open
http://127.0.0.1:8792. Node 22's built-in SQLite is required. No credentials,
database server, Docker, models, wallets or upstream connection are needed.
Optional `AXP_ADVERTISER_PORT` changes only the loopback port.

State persists under ignored `local-state/advertiser-simulation/`. Restart the
same launcher to retain drafts, campaigns and receipts. There is intentionally
no destructive reset button or automatic repeat payment. Create a new campaign
to repeat a closed-channel story; do not overwrite V1/Phase3/4 state.

## Five-minute operator path

1. Business setup: save a fictional brand and HTTPS destination. No production
   enrollment, crawl or account verification is performed.
2. Create campaign: use TripDesk as the fictional travel example; inspect its
   declared capabilities. Choose Evidence, search “Navan”, select an observed
   association and inspect actual prompt, creative and inferred context hint.
   Optionally copy the hypothesis as editable draft wording. The historical
   company is not an AXP advertiser and its ad is not automatically reused.
3. Ad & context: edit your own copy/hints. Spending: max bid 0.004, cap 0.008,
   synthetic deposit 0.020 test USDC. Review and approve. Preview the travel
   task to see bid/skip without reservation or charge; launch the campaign.
4. Repeat using AgentPass and HotelOps presets if showing contrasting buyers.
   For competing bids, create a second travel campaign with a 0.005 maximum and
   a 0.010 cap. These are independently executed deterministic simulated buyers,
   not fresh Jev calls. First-price winner pays its actual integer bid.
5. Placement simulator: “Find a tool for corporate travel booking and automatic
   expense capture.” Run with normal delivery. Show the organic reference
   response separately from the Sponsored card, decisions, bid and receipt.
   TripDesk's default policy bids 0.003, other two presets skip. Retry the same
   turn: same outcome/receipt, no second charge. Run another turn to reach 0.006.
6. Activity & accounting: authorize accepted total, then settle/refund. The
   synthetic channel shows 0.020 deposit, 0.006 spend, 0.014 unused refund.
   All three are different records/states; there is no blockchain transaction.
7. For zero-charge branches, use the identity or hotel task with failed delivery,
   or the informational example for no-fill. Held awards reserve only and expire
   after three minutes or can be failed manually. Settled channels cannot bid.

Business setup, campaign launch/pause, held/failed delivery, acknowledgement and
accounting operate on the actual local Exchange, not canned screen animations.
Organic text and buyers are deterministic reference implementations, not LLMs.

## Evidence-informed decision comparison

Open **Data-informed decisions** at `/#matching`. Choose an open AgentPass
campaign and enter:

> Compare authentication for product and engineering teams building AI travel agents, with secure identity for both human users and the agents themselves.

Click **Compare decisions — no spending**. Inspect own-text vs history support,
the selected Auth0 prompt/creative/inferred hint, and the expanded provenance.
With unchanged preset text and available capacity, the authored heuristic gives
level2 / hypothetical0.002 versus level3 / hypothetical0.003. These are not
quality labels, conversions or targeting lift. Use an informational or missing
required-capability task to see history cannot make it eligible. Closed funding
is labelled unavailable and produces no executable hypothetical bid.

Fresh placement turns use the same evidence engine. Their traces expose selected
historical IDs, policy and support values. A receipt remains the charge event;
scoring/comparison alone never charges. Old turn IDs replay their saved engine.
The frozen12-case comparison and caveats are in `EVIDENCE_COMPARISON.md`;
run `node scripts/demo/evidence-decision-comparison.mjs --check` offline.

## Separate real-payment story

`npm run demo:replay` serves V1 at port 8790: frozen **recorded sandbox evidence**,
not this simulation. Its original six Jev decisions, two organic model answers
and real MPP sandbox settlement remain unchanged. The new dashboard cannot
operate that channel or invoke payment/model endpoints. Do not narrate the new
onboarding as historical configuration of V1's recorded advertisers.

## Verification / handoff

- `npm test`: local suite only; optional external SDK checks remain opt-in.
- `node scripts/demo/advertiser-evidence.mjs --verify-only`: offline hash/schema.
- `node scripts/demo/phase5-bundle.mjs --verify-only`: original evidence parity.
- `node scripts/demo/phase5-check.mjs`: original video/bundle hash validation.
- Frontend specialist: `docs/frontend/ADVERTISER_SIMULATION.md`, separate client
  and types in `packages/advertiser/`, reference screens `apps/advertiser-ui/`.

The bounded catalogue uses 18 real relevant observations, not all ContextHint
data or a reconstructed ChatGPT ranking algorithm. Historical hints are
hypotheses. A local render receipt asserts insertion/disclosure, not attention,
conversion, endorsement or targeting lift. No push, deployment or real spending.
