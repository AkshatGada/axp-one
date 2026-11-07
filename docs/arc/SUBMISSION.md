# ETHGlobal Mumbai submission checklist

**Prize:** Arc Studio Continuity Track: Bring Your Project to Arc — $3,000.
**Deadline supplied by the submitter:** Saturday, **7 November 2026, 9:00 AM IST**.

- Existing repository: https://github.com/AkshatGada/axp-one
- Work branch: `feature/arc-integration` (published with human approval)
- Pre-event baseline: `88c9bfbb9ce5d3b532e1a4bff2a276d4c1c1baa4`
- Published branch URL:
  https://github.com/AkshatGada/axp-one/tree/feature/arc-integration
- Successful Vercel Preview (source commit `be576dc`):
  https://axp-bll2c2o95-lucario004.vercel.app/arc/
  **Vercel Authentication protects this URL:** anonymous HTTP redirected to
  Vercel sign-in. The owner must arrange judge access; public access is not claimed.
- Studio project:
  https://studio.arc.io/app/0c07e997-5564-4b38-94f9-099ea3e95393
- [Setup/demo](README.md), [architecture](ARCHITECTURE.md), [video](VIDEO.md),
  [evidence](VERIFICATION.md), [Studio provenance](STUDIO.md)

## Pre-existing work disclosure

Use this text in the submission and disclose it in writing to ETHGlobal:

> AXP existed before ETHGlobal Mumbai. At commit
> 88c9bfbb9ce5d3b532e1a4bff2a276d4c1c1baa4 it already included advertiser and
> account interfaces, publisher SDK, ContextHint evidence retrieval, Jev buying-fit
> integration, independent DeepSeek example chat, deterministic auctions,
> authenticated DOM insertion receipts, accounting and Solana/Tempo testnet
> payment-channel implementations. Historical hosted recordings, benchmarks and
> settlement evidence are pre-existing work. They are not hackathon executions.
>
> During this hackathon we used Arc Studio to build and review Circle Gateway
> Nanopayments protocol/reference source, integrated an optional Arc Testnet rail
> into AXP's current frontend/backend, added exact per-receipt EIP-3009 payment
> authorization, Gateway funding/acceptance/reconciliation, explicit finality UI,
> recovery/cap tests and new setup/demo/architecture/submission documentation.
> The isolated demo uses labelled fixture buyer and answer providers, with actual
> AXP auction, DOM receipts, signing, accounting, Arc funding and Gateway payments.

## Eligibility the human must confirm

The [prize](https://ethglobal.com/events/mumbai/prizes/arc) explicitly accepts
existing owned projects, including open-source repos and live products.
[ETHGlobal rules](https://ethglobal.com/rules) require approved Continuity-track
participation, substantive new work during the event, written disclosure of all
pre-existing work and open-source new contributions. Partner eligibility may
vary. This implementation matches the stated nanopayment-infrastructure use case;
that is not a determination of the team's registration or ownership eligibility.

- [ ] Team is registered on the approved Continuity track for Mumbai.
- [ ] Submitter owns AXP or has permission to extend and publish it.
- [ ] Pre-existing work is disclosed in writing to ETHGlobal and in repo/video/text.
- [ ] Confirm applicable open-source license for the new work; do not relicense
      unrelated existing source by accident.
- [ ] Confirm any additional team, attendance or event-specific submission requirements.

## Deliverables and final human actions

- [x] Working local frontend and backend on the Arc integration branch.
- [x] Official Circle Gateway Nanopayments SDK, actual Arc Testnet funding and
      completed batch settlement for per-delivery payments; no mainnet/real-fund activity.
- [x] Arc Studio project and substantive source adoption, with reviewed output.
- [x] Diagram, setup/demo guide, video script and recording checklist.
- [x] Small meaningful commits, test results and sanitized public payment evidence.
- [ ] Final judge-openable Studio/share URL verified without owner access. Current
      owner workspace link alone does not prove this; see STUDIO.md.
- [x] Human approved branch publication; `feature/arc-integration` was pushed.
- [x] Existing Vercel Git integration built the pushed branch successfully and
      generated its Preview URL. Local packaged route/asset checks passed.
- [ ] Arrange anonymous/judge access to the Vercel Preview: existing project
      protection redirects signed-out requests to Vercel. No protection setting
      was changed. Production axp.one remains on the original main commit;
      the funded Arc workspace stays local.
- [ ] Record and upload the concise video with Studio visibly demonstrated.
- [ ] If payments remain pending, state their actual status. Batch scheduling is
      controlled by Gateway; the unused custom Studio escrow is not payment proof.
- [ ] Human reviews and submits the ETHGlobal form under the exact bounty name.

The human authorized the feature branch push and existing Vercel Git Preview.
No AXP production promotion, hosted Arc signing activation, new Vercel connection,
ETHGlobal submission or npm publication was performed. Arc Studio's initial unused
testnet escrow deployment is separately disclosed in STUDIO.md and is not part of
the nanopayment proof.
