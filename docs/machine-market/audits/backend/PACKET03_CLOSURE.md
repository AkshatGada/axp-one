# Packet03 focused backend closure

26 October 2026. **SIGNED OFF for the assigned architecture closure scope.**
BKR2-N01 and BKR2-N02 are closed at document/design level, retaining original
Low/B classification. No remaining supported-flow contradiction was identified in
the affected transfer, primary-admission or sponsorship-reservation boundaries.
This is not executed proof, a security guarantee or implementation GO. Builders
remain paused; root alone may authorize subsequent phases.

## Exact target and evidence

Worktree: `/Users/akshat/agentic-dsp/.worktrees/axp-machine-market`.
Packet: `docs/machine-market/architecture/review-packets/v2-review-2026-10-26-03/`.
SHA-256 values verified before review:

| File | SHA-256 |
| --- | --- |
| MANIFEST_V2.json | d77ac0f699a29dd89812137007f3ccb1cbf1d271dbcb738c66fd63c3736a3f3c |
| SELECTED_MODEL_V2.md | 718e0d0744008aa80266f249055a01e202db12f33b4eeefc86ca49242f5e72c3 |
| SPEC_V2.md | 22ab0c74014ebef3ca0b5f753318736278dc5f3104cb4392d78084db865c064a |
| WIRE_V2.md | 836dc27d180eefa4571782d92cf2c33a821c314dcad29a7bc71ce3efdfdcbe08 |
| ACCEPTANCE_V2.md | c99497498a5d26952cc5758f28c5e87307f0d9a2b0950a1b23b317079a0d7de5 |
| AUDIT_DISPOSITIONS.md | 73f3ac09f7f91e517d043b70a59e5cac6192802e11cc10922869c9936a196db6 |
| PLANNING_HANDOFF.md | 924c398f9f2633bcb93490ac5aa07d83b7f6470f2dce98a3a3225b3d40b916e0 |
| PACKET02_TO_PACKET03.diff | de3fb049e888946551cd980f6c3d4a4953265f51db180097b921b5655dd10deb |
| PHASE_METADATA.json | 9c15a9a828bc885469459a80b62c8ef699dfa4506be428eb425052d94ba4cbfd |

Read my complete ROUND2.md (SHA-256
`9db41fe5ed0c9f436f6a2bf4421b8bb614c222468ecf21777a366dd397472753`),
the complete exact diff, and affected actual normative sections/vectors. S/W/A
below mean Packet03 SPEC/WIRE/ACCEPTANCE; all references are line numbers in those
snapshots. Other reviewers' Round2 input hashes were checked against the manifest,
but their focused verdicts were not read. Author disposition text was not treated
as independent evidence of closure.

## Individual closure checks

**BKR2-N01 — Low/B: closed.** S161–183 and W314–323 now require a payer-level
walletStateVersion covering accepted balance observations AND every hold-set change,
including retirement. Admission/signing checks both captured version equality and
the payer observation-slot watermark. A fresh operation ID cannot bypass either.
Observed balance and hold retirement commit together; failed revalidation creates
no new reservation/signature and refetches outside the writer transaction.

Counterexample checked: A pauses with version v and old high balance at s; a later
reconciliation at s+n retires a hold and increments v. A cannot combine the old
balance with the reduced holds, including under a new operation ID. A hold-only
change also invalidates v even without a newer chain slot. V9 (A106–112) encodes
the original delayed-observation schedule within T3/T8. This is the requested local
consistency fix, not a distributed lock or wallet-history service. Its eventual
implementation must execute this vector; closure does not claim that it already did.

**BKR2-N02 — Low/B: closed.** S120–128 and W325–328 explicitly apply the same
effective-rights and exact-face eligibility predicate in BOTH directions BEFORE
price-time selection. V8 (A99–104) has incoming ask100, remaining rights0, resting
bid120/min1 and bid110/min0. It selects eligible110 at maker price110, leaves120
available for a suitable unit, and never first reserves120 or relies on native
failure. The incoming-bid converse uses the same predicate. This remains distinct
from prohibited fallback after a reserved/failed match. No second mechanism or new
book partition for each minimum is necessary.

**Affected transfer/primary contract (SOL-R2-001 Medium/A; MKT-R2-01 Low/B):
consistent in this backend cross-layer check.** S78–100, W51, W95–99 and W157–175
agree on canonical issuance pairs (0,0)/(1,1..3), validated before state changes,
and checked transition/count bounds before subtraction. Primary ordinary fills
have countAfter=0; secondary fills increment once; nontransferable/sponsored rights
have effective remaining0. Ordinary primary admission rejects an impossible minimum
before a hold. Both ordinary Fund kinds enforce the unchanged signed minimum;
the signer cannot lower it. Sponsored Fund must encode minimum0 and remains
nontransferable even over a transferable Series. Minimum0 never permits an otherwise
forbidden resale. V7 (A82–97) covers malformed (0,3), valid consume-only (0,0) with
minimum1 versus0, transferable primary/secondary limits and sponsored override.
No new wire field/layout is needed. This confirms the affected backend/native rule
agreement; it does not replace the assigned Solana review or actual native tests.

**Affected provenance/shared reservation (MKT-R2-02 Low/B): consistent.**
S226–264 and W285–289 separate sponsored-fixed-price procurement from book-maker-price
execution. Both use the same atomic exact-Unit guard; sponsor campaign amount/count
reservation occurs in that transaction, not in a later independently successful
step. V10 (A114–121) checks both reservation orders for regular120 versus sponsor
quote100: only the first reservation can own the Unit; the losing sponsor path
consumes no grant and cannot substitute another Unit under stale consent. If sponsor
wins, its price100 is not represented as proof that120 lost a global competitive
auction. Provenance derives from Fund kind, not an unsigned caller label.

The correction preserves primary-P escrow, immediate secondary-Q seller/fee payment,
the single current-holder P claim, and sponsor-directed refund/nonreplenishment.
It neither adds premium insurance nor changes the existing cancellation/unknown
reservation rules. No additional essential A issue arose from these focused changes.

## Scope and handoff

Accepted boundary remains one writer, concurrent local requests, controlled fixture
signers, intact current DB/ledger and bounded lifetime. No HA, arbitrary-restore,
malicious-operator, production-custody or external-drain infrastructure is requested.
Structural transfer rights do not promise liquidity, future buyers or value.
V7–V10 supplement the existing finite proof groups after root GO; they are planned
checks, not native evidence. Real localhost settlement and runtime conformance
remain future acceptance obligations.

Only this report was written; Packet02, Packet03 and prior reports were preserved.
No research, implementation, tests/builds/installs, validator/RPC, external writes,
pushes, agents or other-thread messages occurred. Observed free disk was142GiB,
above40GB. All listed packet hashes and ROUND2 were rechecked after report creation
and still matched. Stop after this report;
root `01a17200-435b-74c1-9fd0-24a82e3f60ee` retains sole GO authority.
