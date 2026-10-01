# Advertiser onboarding and dashboard — simulation slice

Approved by the user on 2026-10-01. V1 remains the immutable Phase5 recorded
MPP sandbox presentation. This slice is a separate, functional **simulation**,
not a new settlement run or the specialist's final visual frontend.

## Goal

An operator can onboard a fictional advertiser, explore real ContextHint
background evidence, approve their own creative and context hints, configure
hard eligibility and spending ceilings, launch a campaign, and demonstrate
bid/skip → first-price award → disclosed browser delivery → accepted charge →
synthetic cumulative authorization and settlement/refund.

## Reference and AXP differences

Official OpenAI Help Center inspected 2026-10-01:

- https://help.openai.com/en/articles/20001213-ads-manager-account-setup
- https://help.openai.com/en/articles/20001210-create-campaigns-for-chatgpt-ads
- https://help.openai.com/en/articles/20001521-write-context-hints-for-chatgpt-ads

Use the business → campaign → creative/context → budget → review flow as a
reference, not a cloned UI or proprietary algorithm. Context hints describe
relevance; they are distinct from enforceable delivery restrictions.

AXP bills accepted owned-app sponsored-card deliveries, not CPM/CPC/conversions.
Expose advertiser decision traces, deterministic integer bids, publisher floor,
reservations, accepted charges, cumulative authorization and refunds separately.
No production sign-in, KYC, real billing profile, live enrollment or wallet UI.
Website URLs are operator declarations; no automatic scraping or generation.

## Components and ownership

1. Main: simulation service, separate loopback server/launcher and reference UI.
   Reuse the existing Exchange/createSession and publisher renderer; do not build
   a second browser ledger. Persist to a separate ignored local-state directory.
2. Sol6.1-high evidence builder: bounded read-only existing-corpus export/search.
   Reuse cached vectors, prompts, creative copy and inferred hints. No clone,
   regeneration, upstream code import, paid tool calls or product mutations.
3. Main: implemented-route contract, tests, runbook and specialist extension map.
4. Fresh reviewer: one focused functional/claim check, substantive fixes only.

## Functional screens

- Advertiser setup and campaign wizard (drafts persist across restart).
- Evidence library: observed prompt/creative associations and inferred hints,
  independently labelled; selected evidence never enrolls a historical brand.
- Campaigns: launch/pause, creative, context hints, hard rules, budget/max bid.
- Placement simulator: editable task, explicit deterministic buyer/reference
  answer, explainable bid/skip and organic answer separate from Sponsored card.
- Activity/accounting: reservation → actual owned-demo receipt → synthetic
  charge → synthetic authorization/close. Decline/fail/no-fill branches cost zero.

## Gates

- Complete browser onboarding to delivery and simulated settlement; preview
  does not create an opportunity or spend.
- Draft/launch/turn/delivery replay does not create duplicate obligations.
- Paused/off-target/insufficient-budget campaigns cannot win.
- Failed delivery creates no charge; losers remain untouched.
- Campaign evidence IDs are validated; creative remains operator-authored.
- Reference-only organic inputs exclude advertiser material.
- No model calls, native payment SDK, wallet access or upstream mutation.
- V1/Phase3/4/5 evidence and replay package remain unchanged.
- Stable new route contract and a clear frontend handoff, not a broad audit loop.

Reuse **relevant** corpus data through a bounded public/background seam, not all
database rows. Historical aggregate counts remain source/time-specific. Data
coverage is not proof of targeting improvement. New decisioning is labelled
deterministic simulation, never fresh Jev inference or recorded V1 execution.
