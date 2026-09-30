# Hackathon demo and algorithm harness

This is the critical path, ahead of production work. Show the marketplace vision
through actual test-agent behavior, a comprehensible algorithm and standard payment
messages. No claim that correctness tests demonstrate commercial lift or win a prize.

## Demo story

User: "Find a hotel near Marina Bay for TOKEN2049. I need free cancellation."
Travel assistant gives its independent answer. Three fictional campaigns are
available: BayStay (Singapore + free cancellation declared), MarinaRooms
(Singapore + free cancellation declared), and AlpineStay (Switzerland only,
higher maximum bid). Declarations are demo inputs, not verified hotel inventory.

Only eligible buyer agents are invoked. AlpineStay is labelled `policy_excluded`,
not a model-generated skip, and cannot buy the Singapore
placement despite offering more. Among eligible bids, first-price winner is
selected. A separately labelled sponsored card appears. For a second eligible
turn, the operator visibly pauses the other campaign, leaving the actual first
winner eligible (never force a predetermined winner). That buyer must genuinely
bid again; if it skips, preserve that result and do not fabricate a charge.
Two accepted placements on that same advertiser-to-publisher channel are required
for the accumulation demonstration. The final channel settlement demonstrates accumulated
test-USDC charges and unused-funds recovery, with actual receipt correlations.

No ad is forced into the organic answer. No clicks, bookings, performance lift
or live hotel availability are manufactured for the demonstration.

## What the algorithm actually does

1. Classify declared task intent and constraints.
2. Hard-filter destination/mandatory features/exclusions/budget.
3. Give each buyer its remaining eligible opportunity and approved creative.
4. DecisionEngine recommends bid/skip and creative; code computes a bounded bid.
5. Validate output, campaign version and deadline.
6. First-price auction chooses the highest eligible reservable bid.
7. Charge only once for the accepted reference-app rendered placement.
8. Authorize the new cumulative amount and settle it under the channel cap.

This is the concrete algorithm, not an opaque "AI ranking" box. The model helps
interpret task fit and choose participation/creative; it cannot outrank a hard
exclusion. Bid calculation is a deterministic policy, not proven prediction of
conversion value. Jev is an experimental engine compared with simpler baselines.

## Test agents ready before final frontend

Three fixtures, isolated contexts, shared model/effort recorded in run manifest,
approved creative, policy and caps. A test-only deterministic runner and actual
model runner have the same decision DTO. A CLI harness can drive the complete
exchange before the polished UI exists. Configure only invocation-specific
runtime access; no global config changes or wallet tools exposed to model agents.

Minimum task matrix (frozen before trials):

| Case | Expected invariant |
|---|---|
| Singapore + free cancellation | two eligible, geography-mismatched bidder cannot win |
| Eligible broad-target campaign, weak creative fit | invoke real buyer; record genuine bid/skip, not hard-filter exclusion |
| Switzerland hotel | Singapore-only campaigns excluded |
| Explain what a hotel is | no commercial opportunity/no charge |
| Request contains private email | email absent from bidder input |
| Mandatory feature absent from all declarations | no eligible sponsor |
| Winner budget less than proposed bid | reservation rejects; next eligible bidder considered |
| Two simultaneous awards | combined reservations remain within cap |
| Bidder tries "ignore policy" | policy unchanged; invalid fields rejected |
| Late/invalid bidder response | labelled timeout/invalid; cannot reopen auction |
| Render acknowledgement fails | no new accepted charge/voucher increment |
| Replayed receipt | same outcome, no repeated increment |
| Different keys for the same turn | same opportunity/outcome, no second charge |
| Admission versus expiry and closure | exactly one terminal outcome; accepted charges included before freeze |
| Two accepted placements on same channel | cumulative amount equals both prices; one correlated close |
| Unknown close acknowledgement | lookup/reconcile, no new channel purchase |

Measure policy pass/fail, decision reasons, bidder latency/model cost, actual
eligible bid distribution, filled slots, accepted charges and chain settlement.
No numeric relevance score is presented as objective quality without labels.
One pass over the frozen matrix plus focused blocker review is enough for MVP;
do not run research rounds indefinitely.

The eligible-skip fixture uses a broad hotel campaign allowed for the task but
creative text about conference group blocks for a solo traveller. Eligibility
does not enforce that soft preference; the actual engine evaluates it. Freeze
the fixture before testing. An observed bid is recorded as a bid, not relabelled
skip. If no genuine skip is observed, A04 remains unproven; use a separate
labelled deterministic skip to explain the branch, not as model evidence.

## Four-minute demo outline

- 0:00–0:40: positioning, campaign objectives and authorized ceilings.
- 0:40–1:40: question -> opportunity -> agents bid/skip -> eligible winner.
- 1:40–2:20: separately disclosed card and delivery receipt; losing balance unchanged.
- 2:20–3:20: second placement, cumulative authorization, channel settlement/refund.
- 3:20–4:00: explain off-chain algorithm versus standard payment rail; scope and vision.

If live model/payment connection fails, use a clearly labelled recorded successful
run, not pretend a deterministic fixture is a live agent or a local validator
is Devnet. Rehearsal uses receipts; it need not move more tokens.

## Deliberately not in critical path

Production identity federation, cross-tenant accounts, commercial fraud systems,
legal launch review, global deployment, scale optimization, elaborate UI animation,
conversion tracking, autonomous refunds, seller LLM and multi-publisher custody.
Only minimum controls that preserve the correct demo algorithm/payment semantics
remain. A focused independent spec review was requested; no broad audit campaign.
