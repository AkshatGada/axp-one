# Phase 3 result — connected, operator-assisted model placement

Executed 2026-10-01. Plan: PHASE3_TASK.md. Local only; no push or deployment.
This slice demonstrates actual buyer decisions and actual independent answers,
with synthetic financial accounting. It is not the completed network-payment MVP.

## Actual run

Run `phase3-20261001-acceptance`; two distinct turns in `phase3-owned-session`.
Task: Find a tool for corporate travel booking and automatic expense capture.
Three fictional campaigns were eligible in each turn. All receive only their own
campaign and approved cached evidence; no money or competitor campaigns.

| Event | Observed outcome |
|---|---|
| Actual Jev decisions | Six calls, all valid: TripDesk bid twice; AgentPass and HotelOps each skipped twice |
| Auction | Existing deterministic first-price policy; fit3/intent2 gives 75% of TripDesk's4000 ceiling, so price3000 |
| Publisher | Two actual browser Sponsored card insertions; server-signed receipt accepted for each |
| Accounting | Two charges3000+3000 on `phase3-channel-tripdesk`; cumulative authorization6000 |
| Losers | Accepted spend0 for AgentPass and HotelOps, despite their higher configured maxima |
| Settlement |0; all transaction signatures null. No token transfers |
| Restart/replay | Separate process reopened saved state; both outcomes/receipts replayed;0 model calls,0 new charges, identical state/admission hashes |

Actual eligible skips are not hard-filter exclusions. Only TripDesk submitted a
bid in these live rounds; this is not a demonstrated multi-bid competition. The
existing baseline tests separately exercise competing bids and tie policy.
Jev end-to-end engine durations552.5–1024.7ms; no sub500ms latency claim.
Usage7315input/526outputtokens; estimated Jev-only known provider cost$0.00030723,
not an invoice and excluding Codex/app usage and local compute.

## Independent answer runtime correction

The bundled CLI rejected the requested `gpt-6.1-sol` for this ChatGPT login.
Its first failed attempt remains in the original turn and admission record.
No substitute model was selected. Two fresh gpt-6.1-sol low app agents received
only the frozen question and sponsor-free instructions, with no tools requested.
Their actual returned JSON answers were recorded in the local completion bridge.

- First answer: agent `01a0f65e-1e55-7ce2-b8f4-a97a60d15b52`.
- Second answer: agent `01a0f65e-1ece-7c52-9fc6-c00d9dd973e1`.
- Supplied prompt hash: `93d42d92a69dc57fb55f7e128794043a209bf67126183f81a67460bfdf524c45`.

The first answer is a separate recovery, not an overwritten initial result and
not a new auction/charge. The second answer was bridged into its placement.
The UI and provenance explicitly say operator-recorded app completion, not an
unattended CLI call, cryptographic context proof or independently isolated host.
Standalone fresh CLI organic generation remains unavailable with this model/login.

## Evidence and checks

- `artifacts/phase3/connected-run.json`: model results, initial organic error and
  separate recovery, bids, awards, delivery/charge IDs, channels, usage and checks.
- `artifacts/phase3/restart-replay.json`: actual saved-state replay with model
  adapters that throw if invoked; no ledger or admission change.
- `local-state/phase3`: ignored private SQLite state, publisher receipt key and
  operator-recorded app completions. Not a Solana key and not copied upstream.
- Offline suite:181passed,6opt-in skips, zero failures (includes provider doubles,
  no-fill, failed delivery, context isolation and recovery). Live corpus checks
  separately passed23/23, read-only checks, not paid engine trials.
- One focused fresh gpt-6.1-sol high reviewer (`01a0f663-e32b-7821-ac28-51a7e28969bf`)
  found no actionable demo blockers;74focused tests/subtests passed. Limitations:
  app answers are operator attestations; public export has receipt hashes rather
  than independently verifiable receipt signatures. Main separately executed the
  actual saved-state restart/replay check. No broader review loop added.

## Replay runbook

From `/Users/akshat/agentic-dsp`:

```sh
node --env-file=.env.local scripts/demo/phase3.mjs --app-organic
```

Use the existing server if port8788 is already occupied by AXP. Do not launch a
second server or reset state. Open `http://127.0.0.1:8788/`; the existing two-turn
run offers **Replay first placement — no new calls**. A replay redraws the card
and returns its original receipt, never adds another accepted charge.

```sh
node scripts/demo/phase3-replay-check.mjs
node scripts/demo/phase3-export.mjs
node --test 'tests/**/*.test.mjs'
```

The launcher does not start app agents automatically: their completed answers
are saved locally. New model trials require a separately frozen run/call bound;
do not delete admission records or rename this run to reopen provider purchases.
Final styled frontend, broader tasks, recording and real compatible MPP-channel
settlement/refund remain later phases. Rules remain the general default; these
two repeated tasks do not demonstrate targeting lift, conversion optimization,
human attention, full reading, hidden-context absorption or endorsement.
