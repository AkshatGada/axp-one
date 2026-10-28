# Machine-access trading MVP

28 October 2026. The minimal native interface is a CLI over the existing
`/api/trading` service, plus offline inspection of the completed Devnet run.
It does not use the historical `/market/` browser simulator or `/api/market`.

## Start with the recorded native demonstration

From this worktree, using Node 22.18 or newer:

```sh
npm run demo:market
npm run market -- evidence --case D0
npm run market -- evidence --case D1 --json
npm run market -- evidence --case D2
npm run market -- --help
```

These commands read committed public evidence only. They load no credentials or
private state, make no network request, sign nothing and submit nothing. The output
is labeled **RECORDED SOLANA DEVNET**, with the original verification time. It checks
stored hashes and matches displayed signatures/slots to the verified receipt list
before generating Devnet Explorer links. Those links reference recorded finalized
receipts; the CLI does not claim to fetch the Explorer or refresh chain state.

The view shows current recorded ownership, the original 10,000-lamport primary
refund face, immediate secondary seller proceeds of 14,850 and collector fee of 150
on a 15,000 resale, and the final delivery/refund receipt. It includes the actual
1.279395 test SOL cumulative net spend, including earlier fees and retained rent.
D0 delivered and settled; D1 refunded the current buyer; D2 refunded the sponsor.
D2 is not a successful sponsored-body delivery claim.

The Devnet driver used declared fixed cases, not the off-chain price-time book.
The inspector explicitly says that these receipts do not establish book selection.
Use the native service projections below to inspect actual book/match provenance.

## Connect to an already-authorized native service

The service must already be running under its own approved loopback-validator
configuration. This client does not start a validator, load wallets, bootstrap,
fund, reset a journal or revive a terminal acceptance run. The supported origin is
literal `http://127.0.0.1:PORT`; there is no DNS/public-RPC/redirect fallback.
The currently completed run must not be rerun just to start a service.

```sh
npm run market -- live health --origin http://127.0.0.1:8799
npm run market -- live book "$SERIES_PUBKEY" --origin http://127.0.0.1:8799
npm run market -- live unit "$UNIT_PUBKEY" --json
npm run market -- live order "$ORDER_ID" --json
npm run market -- live match "$MATCH_ID" --json
npm run market -- live operation "$OPERATION_ID" --json
```

Replace the variables with IDs from that service. Unit/Series IDs here are base58
public keys; order, match and operation IDs are 64-character hex identities. A
Match ID is distinct from its on-chain Match PDA address. The default origin is
`http://127.0.0.1:8799`. A stopped service returns `SERVICE_UNAVAILABLE`; the client
does not silently start a simulator or attempt recovery.

All `live` inspection commands issue GET only. Their output says
**NATIVE SERVICE PROJECTION**, identifying the origin. Health/configuration is not
chain verification. `freshChainVerification: false` means this client does not
independently verify a chain receipt. The attached service operation evidence and
`operatingFeesKnown` state retain their existing meanings.

The book exposes signed lane, refund face, exact Unit, limit, expiry and priority
sequence. The read-only Match projection shows `book-maker-price` versus
`sponsored-fixed-price`, parties, original primary refund face, linked operation and
receipt evidence. Expected secondary proceeds remain separate from actual immediate
proceeds, which are nonzero only for a settled secondary Match. Reservations and
pending operations are not reported as charges or completed payouts.

## Explicit native operations

Operations forward existing signed W2 envelopes; the CLI is not a signer or wallet
onboarding service. Generate envelopes through the already-approved operator/fixture
context described in [the transport contract](PHASE2_TRANSPORT_INTERFACE.md).
Never put a seed, wallet JSON or private key in a request file.

```sh
npm run market -- submit order --file "$SIGNED_ORDER_FILE"
npm run market -- submit cancel --file "$SIGNED_CANCEL_FILE"
npm run market -- submit campaign --file "$SIGNED_MANDATE_FILE"
npm run market -- submit sponsored --file "$SIGNED_CONSENT_AND_ISSUER_QUOTE_FILE"
npm run market -- submit start --file "$SIGNED_DELIVERY_REQUEST_FILE"
npm run market -- submit read --file "$SIGNED_OWNER_READ_FILE"
```

Ordinary signed files contain exactly `authorization`, `signature` and
`idempotencyKey`. Sponsored access contains `consentEnvelope` and `issuerEnvelope`,
each with those three fields. Input is bounded and validated before transmission.
`submit read` is an explicit authorized private-body read, not a public projection.

Gateway processing and native reconciliation/resend require the existing owner-only
operator capability file. It is neither generated nor discovered by this client:

```sh
npm run market -- operator process --file "$DELIVERY_JOB_FILE" --operator-token-file "$EXISTING_OPERATOR_CAPABILITY"
npm run market -- operator reconcile "$OPERATION_ID" --operator-token-file "$EXISTING_OPERATOR_CAPABILITY"
npm run market -- operator resend "$OPERATION_ID" --operator-token-file "$EXISTING_OPERATOR_CAPABILITY"
```

The delivery job contains `unit`, `requestHash` and `idempotencyKey`. Capability files
must belong to the current user and have mode 600; tokens are sent only in the
existing local operator header and never printed. Resend retains the service's
reconciliation, valid-blockhash and exact-signed-byte rules. CLI inspection does not
invoke these mutation paths. An inspection command cannot turn into a POST.

## Evidence levels and remaining gaps

- **Recorded Devnet:** deployment and D0/D1/D2 passed at `0faa13e`. The saved proof
  includes 458 finalized transactions across both runs, including four expected
  negative probes. The total was 463/478 attempt slots and 429/432 write slots.
- **Live service projection:** the CLI reads the configured native service; it does
  not certify a backend as chain-verified merely because health/configuration works.
- **Sponsored-success host fixture:** the existing native JS store/outbox/signature,
  observer/reducer, delivery and payout path was exercised with scripted Solana RPC.
  Sponsor 10,000 → issuer 9,900 + collector 100; independent source bytes unchanged;
  separate Sponsored packet; exact response/restart replay with no second payout.
  The Rust program/validator was not executed for this new success trace.
- **Historical localhost native acceptance:** 16 trades, 65 known signed transactions,
  financially drained; harness remains **38/40**. Existing deterministic Rust host
  boundary tests are accepted as narrower rule evidence. The two exact-slot
  validator probes remain unproved; no new timing campaign ran.
- **Historical simulator:** inherited untracked `/market/`, `/api/market`, synthetic
  client/core and old server describe a superseded full-chain escrow model. They are
  not the native interface or settlement proof. They remain preserved and excluded
  from this phase's scoped commits. The inherited synthetic `build:market` and broad
  `test:market` working-copy scripts are likewise outside this handoff.

A genuine new sponsored-success validator trace would require reopening the stopped
validator and issuing/funding another sponsored Unit, or adding a new bank harness.
That work was not performed in this finishing phase. A4/Devnet D2 already proved the
declared negative-assessment sponsor-refund case; it must not be rewritten as success.
No new funded native/Devnet run, credentials, paid call, mainnet, cloud write or push
was used to finish the interface.

## Focused verification and handoff

```sh
npm run test:market:mvp
```

This is the changed CLI/service integration set, not a broad repository audit. Its
sponsored fixture also opens one ephemeral `127.0.0.1` HTTP listener for six GETs.
It may require loopback permission in a restrictive sandbox. All Solana RPC replies
remain scripted, and the temporary listener/store are closed after the test.

The usability record includes an actual offline `demo:market` invocation and six
native-client GETs over that fixture service, with zero extra signer calls/native
sends. Artifacts are in `artifacts/machine-market/mvp-finish/`. See the
[acceptance matrix](MVP_ACCEPTANCE.md), [Devnet execution](DEVNET_RETRY_EXECUTION.md)
and [original local result](PHASE2_NATIVE_ACCEPTANCE_RESULT.md).

For an optional fresh read-only check of the saved Devnet run, the operator can run
`node scripts/machine-market/devnet-retry-verify.mjs` with its existing ignored local
journals available. That is separate from the offline default demonstration; it
loads no keys, signs nothing and broadcasts nothing. No funded command is needed
for any inspection workflow above.
