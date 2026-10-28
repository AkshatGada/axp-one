# MVP finishing phase handoff

Implementation commit: `f68fe83`. The native CLI/client and additive read-only Match,
lane and original-face projections are complete. Entry docs, scoped package scripts
and the acceptance matrix now distinguish native recorded proof, live native API
projections and the inherited synthetic browser prototype.

## Exact entry commands

```sh
npm run demo:market
npm run market -- evidence --case D1 --json
npm run market -- live health --origin http://127.0.0.1:8799
npm run market -- --help
npm run test:market:mvp
```

The first two inspect committed native Devnet receipts offline; they never contact a
service, load credentials, sign or broadcast. Live commands require an already-approved
running `/api/trading` service. Explicit `submit`/`operator` actions forward existing
signed contracts/capabilities; no signer daemon or startup/funding shortcut was added.

## Results and evidence

- Focused changed-integration checks: **10 passed, zero failed/skipped**.
- Captured sponsored-success fixture/HTTP walkthrough: **one passed**, overlapping
  the ten. Six actual loopback HTTP GETs, zero mutation requests, zero extra signer
  calls/native sends. The temporary listener/store closed after the test.
- The host fixture followed IssueSeries → RegisterUnit → Sponsored Fund →
  StartDelivery → FinalizeDelivery, using actual JS store/outbox/byte verification,
  observer/reducer and delivery implementation with scripted RPC/account transitions.
  Four distinct Fund signers; sponsor debit 10,000; issuer payout 9,900; collector
  100; independent source hashes identical; separate Sponsored packet; response and
  restart replay with no extra sends/signatures/payout. Native program execution and
  public broadcasts for this trace are zero.
- Actual offline usability output shows D0/D1/D2 ownership, primary refund face,
  immediate secondary proceeds, terminal receipts and verified-signature Devnet links.
- Frozen Packet03, original native acceptance, funded Devnet records and the
  trading/outbox/delivery/Rust settlement code are unchanged by hash from `0faa13e`.
- No new funded public/native run, persistent credentials, paid calls, mainnet, cloud
  write or GitHub push occurred. The terminal Devnet run still records 1.279395 test
  SOL total net spend, 463 attempts/429 writes and no unresolved outcomes.

## True remaining evidence boundaries

The original local native result stays **38/40**; two exact-slot validator probes
remain unproved. Existing deterministic Rust host tests are accepted as narrower
rule evidence. No new timing campaign was run.

New sponsored successful-body/payout coverage is **host-fixture evidence**, not a
new Rust-program/validator/Devnet execution. The actual Devnet D2 negative-assessment
sponsor-refund case remains intact. A new native sponsored success would require a
fresh funded Unit/validator campaign or a new bank harness; neither was added here.

The CLI operates against the existing operator-managed native service; this phase
does not introduce an always-on public deployment, wallet onboarding or production
infrastructure. The historical untracked `/market/` simulator remains excluded and
must not be labeled native. No new execution is needed for the default recorded demo.

## Ownership and storage

Only the three native package scripts were staged; inherited `build:market` and
broad `test:market` remain working-copy changes. Marketing CSS and all legacy
untracked prototype/UI files are preserved outside the commits. OWNERSHIP.md lists
that boundary. Initial assertion/sandbox-denial logs are retained as debug history;
final pass counts come from `focused-integration-tests.txt`.

Final sampled storage: 147,844,648,960 free bytes, 7,982,485,504 task bytes,
4,304,896 original app bytes. Resource limits pass. No broad audit, benchmark,
new model/provider run or hardening campaign was performed. Stop here for root review.
