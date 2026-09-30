# North Star

Version: planning v0.1, 2026-09-30. Normative proposal, not implementation evidence.

## Product

**AXP.one — The advertising exchange for the agentic internet.**

The name describes the product vision, not an existing adopted protocol or a
claim that this repository changes the public AXP.one website. The local repo
remains `agentic-dsp`. Exchange, buyer DSP and publisher SDK are distinct layers.

An agentic demand-side platform for conversational AI advertising. Advertisers
define allowed audiences/tasks, approved creative, a maximum bid and a budget.
Buying agents recommend whether to bid and which approved creative fits an
opportunity from an AI app; deterministic policy computes the permitted amount.
The exchange validates every decision, selects an eligible winner and accounts
for disclosed delivered placements. Capped stablecoin channels accumulate charges.

The buyer is the advertiser; the seller is the AI application operator; the end
user receives an organic answer and a visibly separate sponsored card. The
research assistant is not obliged to read, cite or endorse sponsor claims.

We implement the small DSP, exchange and publisher integration together for
the MVP, while keeping their responsibilities separate. Agents propose buying
decisions; deterministic policy code owns financial authority.

## Demonstrable goal

One owned travel assistant, three fictional advertiser campaigns, three isolated
buying-agent contexts and one card format. Two hotel advertisers compete; an
off-target advertiser offering more money is rejected. Multiple actual rendered
placements accumulate charges within an approved cap. A channel settlement and
unused-funds recovery are demonstrated on a precisely labelled test network.

No actual hotel rates, availability, booking or verified commercial performance
is implied by the fixture brands. Demo claims explicitly say fictional.

## Observable success

Hackathon priority confirmed: the algorithm, protocol and test-agent demonstration
come first. Production readiness, real-user account systems and scale tuning are
not completion criteria. See DEMO_AND_AGENT_HARNESS.md for the concrete storyline.

- At least two actual model-generated buying decisions, including bid and skip,
  tied to frozen campaign/opportunity versions. Three isolated advertiser contexts
  use the same configured model; only eligible buyers are invoked. Policy exclusion
  is not a model skip. Rule-only runs are separately labelled.
- Organic answers are generated without winning creative in their model input.
- At least two accepted placement receipts, plus no-ad, failed-render, duplicate
  and insufficient-budget branches, have reconciled ledgers.
- Payment accumulation and settlement are correlated to those receipts, not
  generic stream bytes or opening a funded channel.
- Total settled charges equal accepted signed authorization under the cap;
  publisher receives funds and unused deposit is recoverable.
- Restart preserves outstanding obligations and cannot produce duplicate charges.
- The backend and basic reference UI are reproducible without final visual design.

## Non-goals

No production ad network, demand partnerships, claimed advertisers onboarded,
CAC/conversion optimization, private ChatGPT algorithm recreation, cookie profiles,
sensitive targeting, concealed sponsorship, autonomous creative generation,
forced citations, ChatGPT-native placement, managed Cloudflare integration,
mainnet funds or scalable fraud-proof viewership measurement. No novel-standard
claim: existing ad/payment protocols remain intact.

## Settlement scope

Prefer MPP session channels for many separately accounted placements, subject
to PAYMENTS.md feasibility tests. x402 exact is a future independent fixed-charge
adapter, not the MVP's required second path. x402 upto is not assumed to be a
reusable campaign channel in the inspected pay.sh integration.

The initial single-publisher demo has no network fee; authorized channels pay
the publisher directly. Network revenue splits are deferred, avoiding an
unproven multi-recipient or custodial payout system.

## Delivery definition

Billable event: accepted reference-app render acknowledgement under a signed
publisher assertion, bound to the awarded creative and price. This is intentionally
weaker than human attention or independently verified viewability. We test DOM
insertion and disclosure; we do not claim eyeballs, conversions or advertiser lift.

## Stage boundary

Research -> documented design -> fresh high-effort audit -> corrections -> user
review -> feasibility spike -> implementation. Planning acceptance is distinct
from SDK feasibility or a completed MVP. No spending permission is inferred from
older AXP transaction limits.
