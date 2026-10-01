# Phase5 — credential-free recorded demo

Original run: `phase4-20261001-acceptance`. Original financial network:
**official hosted Solana payment sandbox**, not Devnet/mainnet.
Presentation: **recorded_evidence_replay**, not fresh model/payment execution.

## Launch

Requires an existing Node22+ runtime and npm. No npm install, SDK, TypeScript,
Docker, database, `.env`, credentials, wallets or upstream connectivity needed.

```sh
cd /Users/akshat/agentic-dsp
npm run demo:replay
```

Open `http://127.0.0.1:8790`. Previous/Next, the section selector, or left/right
arrows navigate. Home/End move to the first/last section when a selector is not
focused. Stop with Ctrl-C. If occupied, `AXP_REPLAY_PORT=8791 npm run demo:replay`.
The server listens only on127.0.0.1. All non-GET requests are rejected with405.

For another person, extract `artifacts/phase5/axp-phase5-offline.tar.gz`, enter
its `axp-phase5` folder, then run `npm run verify` and `npm run demo:replay`.
No absolute local project or source repository is needed inside that package.
Verification checks source evidence, captured frames and packaged-file hashes;
hashes are integrity checks, not independent third-party attestation.

## Present the four-minute story

Use `artifacts/phase5/recording/axp-four-minute-demo.mp4` as the reliable backup.
It is a silent, captioned, edited **browser screenshot/frame-hold walkthrough**,
not continuous footage of original paid execution. The matching SRT and
`narration.md` are alongside it. Read narration live; no generated voice is used.
Browser screenshots came from actual read-only navigation. Captions were
rendered in the browser before capture; the installed FFmpeg encodes the frames.
Resolution1280×1200 preserves complete text and captions instead of cropping
the default browser's full-page content to a widescreen frame.

| Time | Section | Operator focus |
|---|---|---|
|0:00–0:30|The exchange|Purpose; original sandbox vs current replay|
|0:30–0:50|Campaign constraints|Fictional capabilities, caps; only one funded advertiser|
|0:50–1:10|Real source evidence|Actual prompt/creative-ID associations and inferred hints|
|1:10–1:35|Actual bid and skip|Six Jev outputs; measured timing and deterministic price|
|1:35–2:00|Independent answers|Two actual organic answers, operator-recorded bridge|
|2:00–2:18|First delivery|Sponsored card, original charge and receipt bindings|
|2:18–2:35|Second delivery|Second charge; other campaigns charged zero|
|2:35–2:55|Cumulative authorization|3000→6000 native MPP authorization, not two transfers|
|2:55–3:25|Settlement and refund|Deposit0.020, payout0.006, refund0.014; fees/rent separate|
|3:25–3:45|Restart without repaying|Original unchanged outcome; presentation has no adapters|
|3:45–4:00|What this proves|Working connected experiment; unproven targeting/attention|

Never use Phase3/4 launchers, CLI payment commands, provider calls or a faucet
to rehearse. Do not imply the replay happened live or that a current explorer
lookup is required. Supplemental explorer links target the original sandbox;
the hosted validator may reset. Saved transaction/account evidence remains in
the replay bundle. Local event timestamps and sandbox block times are distinct
clock domains; presentation order is explanatory, not a merged wall-clock trace.

## Inspect evidence

- `artifacts/phase5/replay/manifest.json`: copied public source hashes.
- `connected-run.json`: six decisions, two completions, receipt/charge/voucher links.
- `chain-check.json`: original finalized transaction/account status and balances.
- `restart-replay.json`: original before/after records, zero new payment/model work.
- `source-profiles.json`: profiles captured from the existing Phase4 public
  bootstrap; their hashes match original decisions. No new lookup was performed.
- `phase2-summary.json`: original bounded research result and limitations.
- `recording/captures.json`: actual browser frame provenance, hashes and edit timing.
- `recording/video-check.json`: duration, codec, hashes and caption/audio method.

There is no private spending voucher in any public projection. Receipt packets
are public publisher attestations, not wallet spending authorization. They were
reconstructed on later deterministic replay and retain `recordedOnReplay:true`.
An accepted receipt supports owned-app insertion/disclosure, not attention,
full reading, hidden-context absorption, endorsement or conversion.

Synthetic examples are in a separate selector. Only awarded/finalized fixtures
come from the real run. Competing funded bids, no-fill, failed delivery,
accepted-but-unpaid, authorized, pending and unknown are hypothetical test
states—not snapshots proving those branches occurred on the sandbox channel.

## Verification without spending

```sh
node scripts/demo/phase5-bundle.mjs --verify-only
node scripts/demo/phase5-check.mjs
node packages/client/generate.mjs --check
node scripts/demo/build-frontend-fixtures.mjs --check
npm test -- --phase5-report
```

These checks do not run opt-in DB/network/provider tests. Do not set live test
flags. The first verifies original Phase3/4 files against the preserved baseline.
The offline archive's `npm run verify` also checks all packaged file hashes.
The replay process counters at `/v1/replay/diagnostics` describe this server only;
there are no model, receipt-acknowledgement or payment adapters in that process.

## Frontend handoff

Start with `docs/frontend/SETUP.md`, `SCREEN_MAP.md`, and
`packages/client/openapi.json`. Use the generated DTOs and thin browser client.
Keep sandbox financial mode separate from recorded replay status. Final layouts
and motion belong to the specialist; backend retains selection, ledger, receipts,
budget and signing authority. No planned API route may be invented by the UI.

No commit/push/deploy, public release, additional purchase or final visual design
is included in Phase5. Main report and one bounded reviewer outcome are separate.
