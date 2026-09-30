# Payment feasibility follow-up — 2026-09-30

**Lane C result: pinned-source payload check ready; full MPP adapter and Devnet
compatibility blocked.** One small source/codec execution attempt succeeded;
no corrective source/runtime attempt was needed. Preserved synthetic adapter
commit 805c06c unchanged. No full monorepo install, installer/global configuration
change, wallet/key/config read, authorization signing, simulation, transaction,
funding, custom program, push or deployment occurred in this follow-up.

Task/demo beat: preserve the accepted-charge seam while determining whether native
MPP payload checking and actual channel settlement can advance. Master-plan C08
payments corresponds to older packet C06; this is lane C under EXECUTION_LOOPS.md.
Main's explicit approved restart supersedes the older paused status text.

## Ready / blocked gates

| Gate | Actual result |
|---|---|
| Existing synthetic accepted-charge adapter | Preserved; no implementation changes in this follow-up |
| Exact source acquisition/provenance | Ready; reuse previously retrieved PayKit c294f8903f18efc746584e3cc2961d6033b8365c |
| Published @solana/mpp@0.11.0 artifact | **Blocked: exact registry endpoint returned HTTP 404** |
| Existing local runtime assets | Kit/codecs 5.5.1 in both prior AXP node_modules; not reused as pinned 6.10.0 dependencies. Existing TypeScript5.9.3 observed but not executed |
| Narrow pinned voucher source check | **passed_source_payload_check** with exact codec 6.10.0 closure and an explicitly adapted import seam |
| Full @solana/mpp client/server package import/build | **not_run/blocked**; narrow source test is not a package import or SDK-success claim |
| Source server reserve/commit/close/SessionStore/idle lifecycle | **not_run**; synthetic F01–F16 are not substituted for native handlers |
| Devnet genesis/program/program-data/mint reads | Refreshed successfully; retained finalized observations |
| Deployed ABI/voucher verifier/treasury relationship | **Blocked: no verified deployment mapping**; source treasury placeholder remains |
| Actual channel open/two charges/settle/refund/reclaim | **Blocked**; no instruction simulation or transaction attempted |

## Small no-value source check

Original, unchanged source copied with MIT provenance:
`packages/payments/spike/pinned-voucher.ts` from
`typescript/packages/mpp/src/shared/voucher.ts` at selected commit.
Original source SHA256:
`d27f5322cc9b5e6bd16073bdc7ce6880e8f73d6e3196e53b62d30f33d8ba062e`.
Retained upstream notice: `scripts/payment-spike/UPSTREAM_LICENSE.txt`.
No production imports or public adapter exports were changed.

Harness: `scripts/payment-spike/pinned-payload-check.mjs`. It verifies the source
hash, checks dependency versions, strips TypeScript types using native Node25,
and explicitly replaces **only the @solana/kit barrel import** with its exact
6.10.0 codec dependency implementations. This is an isolated source harness,
not the complete @solana/kit or @solana/mpp package export path. The adaptation
and transformed-module hash are recorded. No custom codec stub, alternate SDK
version, network downgrade or production adapter substitution is used.

Fetched six exact packages into disposable projectless task-local storage,
without any npm/pnpm installation or lifecycle scripts:

- @solana/codecs-strings, codecs-numbers, codecs-core and errors: **6.10.0**.
- chalk **5.6.2**, commander **15.0.0**; match dependencies and upstream lockfile.

Every archive was checked against exact registry SHA512 integrity. Dependency
closure was enumerated and unexpected dependencies rejected before extraction.
Per-write limits enforce total new logical task assets <100MiB and Mac free
space >=50GiB, with declared-size/5MiB-download buffer preflight. Archive paths,
links and expanded sizes were checked; no package scripts ran. New asset bytes
at acquisition completion: **4,410,779 (~4.21MiB)**; observed physical task usage
was about **4.8MiB**. Free after acquisition: **57,282,129,920 bytes (~53.35GiB)**.
This follow-up stayed below the bound. No repeat of the 668-package closure occurred.

Executed source check:

- Original versioned payload is **50 bytes** (`5601` magic, 32-byte channel,
  u64 cumulative at offset 34, i64 expiry at offset 42).
- Totals100 and 350 have correct native integer bytes; repeated encoding is stable.
- Malformed address, negative/overflow amount and unsafe parsed expiry reject;
  maximum u64 encodes without floating-point conversion.
- All-zero 64-byte signature is rejected by the pinned verifier.
- **Zero signatures created**, zero wallet key reads and zero broadcasts.

Four new native node:test checks passed. The combined payment suite passed
21 tests with zero failures/skips using the explicit codec root. This does not test a positive voucher
signature, post-receipt server metering, client ActiveSession, native close,
SessionStore recovery or deployed-chain verification. Existing AXP synthetic
ledger tests are preserved and main may integrate them separately.

Reproduce with the explicit disposable dependency root (no auto-download):

```sh
node scripts/payment-spike/pinned-payload-check.mjs --dependency-root /Users/akshat/Documents/Codex/2026-09-30/implement-approved-c06-bounded-no-value/work/c06-followup/node_modules
C06_CODEC_ROOT=/Users/akshat/Documents/Codex/2026-09-30/implement-approved-c06-bounded-no-value/work/c06-followup/node_modules node --test tests/payments/pinned-payload.test.mjs
```

Without C06_CODEC_ROOT, dependency-requiring tests explicitly skip. The default
payment suite remains offline and does not fetch dependencies. This disposable
root is a spike asset, not a production runtime dependency or sibling-app import.

## Exact artifact decision for main

The selected source remains **@solana/mpp 0.11.0 at c294f890**. No pin was changed.
The exact published 0.11.0 endpoint is absent. A usable full source artifact might
be built from an isolated minimal package rather than the upstream workspace;
that full package build/closure has not been executed or declared ready here.
The small source check shows that the voucher path itself needs only a small
closure; it does not establish that all client/server exports fit the bound.

If main explicitly chooses a **published artifact revision**, the precise
proposal is **@solana/mpp@0.7.0** from
`https://registry.npmjs.org/@solana/mpp/-/mpp-0.7.0.tgz`, integrity:
`sha512-vJfqf4bZkgaSztq4giEinZfU/94T5QwO2m+Ck3QMHU1PgPnFffgJaawHmK3umW71XUxW5sxA3Tm8SCg2XzCm+w==`.
Archive SHA256/size and runtime export lists are retained in follow-up evidence.
It was inspected in memory with a 2 MiB cap and integrity check; **not installed,
imported, adopted or connected**. No npm latest pin is proposed.

0.7.0 contains ActiveSession, SessionConsumer, HttpCommitTransport,
buildOpenPaymentChannelTransaction, session, createMemorySessionStore,
submitSettleAndDistribute and buildReclaimInstruction. Its named export contract
still differs: it lacks pinned 0.11.0 public MAX_IDLE_TIMEOUT_SECONDS,
resolveIdleTimeoutSeconds, validateIdleTimeoutOptions and session-authentication
helpers; server export list lacks CHANNEL_STATE_SCHEMA_VERSION,
OPEN_SLOT_WINDOW and PAYMENT_CHANNELS_PROGRAM_ID. Extra older client helpers
also differ. Main would need an explicit artifact/contract revision and targeted
metering/store/close parity tests before adoption. This proposal does not resolve
Devnet deployment compatibility. Staying with the selected source pin is valid;
no artifact change is necessary for the synthetic exchange seam.

Primary exact metadata/source references:
[0.7.0 registry metadata](https://registry.npmjs.org/@solana%2fmpp/0.7.0),
[selected voucher source](https://github.com/solana-foundation/pay-kit/blob/c294f8903f18efc746584e3cc2961d6033b8365c/typescript/packages/mpp/src/shared/voucher.ts).

## Read-only deployment compatibility result

Refreshed at **2026-09-30 14:52:01 UTC (20:22:01 IST)**. Explicit Devnet RPC only;
finalized slot 505940424, mint observation 505940426. Program remains executable;
program-data deployment slot 480232051. Deployment-byte SHA256 remains
`acdb3abfc818a7350e876db42253d465fe31f5d52da0259c7ef3806191b3cf8b`.
Expected test-USDC mint owner and 6 decimals were observed again.

Targeted source inspection at payment-channels
`3ffa4d6728ad88e4a9667a76ad9ccd68a302c696` still shows the Devnet treasury
**0xBEEF placeholder plus build guard**. The pinned SDK embeds mainnet-build
owner `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP`. No source-to-deployed-binary,
ABI/IDL or deployed treasury mapping was established. The official GitHub
releases endpoint returned an empty list; that alone is not proof that no other
credible mapping exists. Source constants/program presence cannot certify the
observed binary. Status is **blocked**, not a proven incompatibility.

Minimum next compatibility plan (not executed): obtain a credible mapping of
the observed binary hash/deployment slot to immutable program source/IDL and
cluster build constants; identify deployed treasury and canonical ATA; freeze
explicit public payer/payee identities and required token accounts; verify SDK
instruction/account/voucher encoders against that deployment. Only afterward
prepare the separately scoped no-signing simulation plan. No existing wallet key
or token transfer is needed to resolve the mapping. Do not patch treasury or
mint, deploy a custom program, switch network, or infer compatibility from a
simulation/finalized metadata read.

[Program constants](https://github.com/solana-foundation/payment-channels/blob/3ffa4d6728ad88e4a9667a76ad9ccd68a302c696/program/payment_channels/src/constants.rs),
[pinned SDK treasury](https://github.com/solana-foundation/pay-kit/blob/c294f8903f18efc746584e3cc2961d6033b8365c/typescript/packages/mpp/src/server/session/on-chain.ts).

## Integration APIs and stopping point

Production/synthetic seam unchanged:
`SyntheticPaymentAdapter({store?,now?})`, `open({mode:'synthetic',...})`,
`authorizeCumulative({channelId,chargeId,amountBaseUnits,accepted:true,...})`,
`prepareClose({channelId})`, `confirmClose({channelId,planId})`, lookup/reconcile.
See existing packages/payments/README.md. Main may connect that trusted
accepted-charge seam now; totals and closure remain explicitly synthetic.

New spike-only APIs (from the script, not public payment index):
`loadPinnedVoucher({dependencyRoot})` and
`runPinnedPayloadCheck({dependencyRoot})`. They do not sign, open, submit,
charge, settle or modify the synthetic adapter. Source fixture uses a zero-byte
public channel identity only as encoding input; it is not a funded channel.

Evidence directory: `scripts/payment-spike/evidence/followup/` includes payload
results, four-test output, codec integrity/size closure, exact alternative artifact
proposal/export snapshots, empty official release response and refreshed
read-only network observations. Stop here: full SDK package import and actual
Devnet A09/A11/G5 stay blocked pending an explicit artifact/deployment decision.
No second broad dependency attempt or production hardening is warranted.
