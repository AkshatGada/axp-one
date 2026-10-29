# Proposed bounded continuation — exact buyer attempt and two refunds

29 October 2026. Planning only. The enforced runtime cap remains **2,400,000 ms**.
No validator, financial operation, cap change, recovery implementation or test
campaign is authorized or started by this document.

## Exact approval requested

Add **900,000 ms (15 minutes)**, changing the cumulative active-runtime ceiling to
**3,300,000 ms (55 minutes)**. Carry the actual **2,395,614 ms** already consumed;
future allowance would be **904,386 ms (15m 4.386s)**, including startup and shutdown.
This is one finite extension, not a reset or standing allowance. Stop early when done.

Reserve the window as follows:

| Work | Maximum planned allocation |
| --- | ---: |
| Startup, identity checks and original buyer Fund reconciliation | 3 minutes |
| Human buyer continuation, failure delivery and finalized refund | 3 minutes |
| Human sponsor-failure Run, native workflow and finalized refund | 3 minutes |
| Final native/account/response-denial verification and export | 1 minute |
| Protected drain / observation reserve; no new case admission | 5 minutes |

The runtime ceiling does **not** extend the original Series/useBy or read deadlines.
Actual chain slot/blockheight and adequate deadline headroom must be checked live.
The last observation was context slot **4728**; Series useBy remains **6190**, read
expiry **10190**. Slots and blockheights must not be substituted for one another.
A slow/unready handoff or insufficient slot headroom stops admissions rather than
changing either deadline. The full time allocation is a ceiling, not a promise that
all operations remain admissible for 15 minutes.

## Reconcile first — no financial admission while Unknown

Original buyer Fund operation:
`635a026cdbf1485e8e5f7d30ffc0e75dd07e5a13331f12459ea1291714db042a`.
Original signature:
`3na3JMKBtuujwMLXPcaSxmsvLfpiUh4QonRgrYvCJqtdAcBjWMzhChYkrFgKyYMYPhr5Nef2eM95Q3DvtM1ZbPPh`.
Original lastValidBlockHeight **4845**; blockhash and exact message/transaction hashes
are in [BUYER_UNKNOWN.json](../../artifacts/machine-market/agent-access/BUYER_UNKNOWN.json).

Observe that original signature and the original native Unit/Match/OrderUse accounts,
blockhash validity and actual blockheight. Preserve signed bytes, the one send record,
all historical failures and the full **10,000 principal + 15,000 fee + 9,458,640 rent**
reservations until outcome is established. Never re-submit, re-sign, refresh the
blockhash/nonce or create replacement funding while the outcome is Unknown.

- If finalized success is proved, continue only that existing funded buyer Unit from
  its actual cursor into the already requested failure/refund path. No second Fund.
- If an exact finalized failure is proved, preserve its original fees/outcome. A buyer
  refund cannot be claimed when no principal was escrowed; report that concrete
  blocker rather than silently create another Fund to make the test pass.
- Expiry plus absence is not inferred from a null transaction response or slot number.
  Preserve separately observed original-signature/validity/blockheight/native-account
  evidence. Do not invent an outbox transition or replacement-signing path if the
  existing journal cannot represent the proved outcome. Report the blocker.
- If unresolved after the initial reconciliation allocation, admit neither case.
  Use only the protected observation reserve as needed, then stop with full original
  reservations intact. No recovery deadline may override financial uncertainty.

## Minimal preparation needed after approval, while stopped

Permit only this pinned Unknown buyer operation to enter an observation-only startup
lane with no financial admission. Validate both completed success cases against
preserved finalized proofs and current native accounts; keep their response/receipt
files byte-for-byte. The buyer continuation becomes available only after exact
funded success is proved; it skips order matching and Fund entirely. The untouched
sponsor-refund Unit remains unavailable until buyer refund verification completes.
No generic recovery platform, production watcher or unrelated test work is included.

Add a small admission/drain control before starting: an operator stop first
**synchronously closes admission**, acknowledges that closed state to the page and
rejects later Run requests before any reservation/signing. If a case was admitted
before closure, preserve and finish/observe that original case during the reserved
window; do not close its store/validator merely because the operator requested stop.
This directly addresses the previous stop/Run overlap. No new case may begin with
less than **five minutes** of active allowance, insufficient live slot headroom, or
any unresolved native outcome. Also require at least **450 slots** before Series
useBy for a new Fund or Start; do not infer that headroom from wall-clock time.
Close admissions before the reserve and stop when
terminal/known; the hard cumulative limit remains binding even if a blocker persists.

Prepare page and read-only verification while stopped. Start the finite native
window only once the human confirms readiness for the required final actions;
do not spend it waiting for unknown availability.

## Expected human actions, unchanged caps and stop evidence

Reconciliation needs no human transaction click. If original funded success is
established, **two final actions remain**: (1) Continue the existing buyer failure/
refund case; (2) Run the untouched sponsored failure/refund case after buyer proof.
The human performs both final actions. No browser/API/CLI substitute is permitted
for the current final-action safeguard. If reconciliation disproves funding or
remains unresolved, stop and report; do not ask for a redundant broad key/funding consent.

Funding stays **216,000,000 / 250,000,000 LOCAL lamports**, with **zero new faucet
requests**. Attempt usage starts **18/32**, including the Unknown original. If funded
success is established, two buyer operations plus three sponsor operations would
bring the expected total to **23/32**. Original fee/rent/principal, sponsor mandate,
W2, program-signing and storage ceilings remain unchanged. Preserve the ledger,
genesis, program, keys, four Units, both successes, deadlines and all attempt history.
No push, hosted write, user wallet, provider call, mainnet or new public Devnet run.

Success requires finalized original buyer Fund evidence, actual buyer/sponsor refund
recipient deltas of 10,000 each, no protected response on either failed case, no
remaining principal or unknown native outcome, and unchanged completed successes.
Keep sponsor consumed allowance distinct from returned collateral. Save sanitized
proof and limits, stop owned runtimes, then commit locally. Otherwise save the exact
blocker, original reservations and partial outcomes without claiming four-case success.
