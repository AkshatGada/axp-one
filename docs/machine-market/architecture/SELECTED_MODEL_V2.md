# Selected v2 economic model — integration checkpoint

26 October2026. Latest root direction ADOPTED; no correctness objection to its stated
terms. This replaces the former contingent full-chain model, which remains comparison
history only. This checkpoint is not a freeze, audit approval or implementation GO.

1. Primary buyer deposits P into the primary Match escrow. Issuer and platform primary
   fee remain unpaid until delivery commitment or agreed unused expiry.
2. Secondary buyer pays Q atomically to seller net(Q-fee(Q)) and collector fee(Q),
   together with native ownership/cursor transfer and order consumption. Secondary
   receipt holds rent only. No secondary gross enters issuer escrow.
3. Ordinary current ownership carries ONE indivisible original-primary-value P refund
   claim. It is not resale-price insurance. Historical sellers keep their completed
   proceeds and fees; no clawback/full-chain unwind. Claim extinguishes once.
4. Delivery/unused-expiry pays issuer P-fee(P) and collector fee(P). Admitted failure/
   timeout refunds P to current locked owner. Sponsored rights never transfer and
   refund their recorded sponsor. Refund does not replenish campaign allowance.
5. fee(x)=floor(x/100). Operator transaction fees/rent remain separate. Example:
   P10000, secondary15000/8000 => immediately22770 seller proceeds+230fees; only10000
   stays escrowed. Success adds issuer9900+fee100; failure instead refunds current
   holder10000. The last buyer may recover less OR more than its resale price.
6. One price-time/maker-price matching algorithm, quantity1. Primary and secondary
   are typed lanes of that algorithm. Primary claim face is actual execution gross.
   Secondary book compatibility includes EXACT signed originalPrimaryRefundFace=P,
   alongside exact Series and minimum remaining transfers. This avoids treating
   same-Series units with different primary prices as equivalent. Primary uses
   a zero sentinel meaning claim face=actual primary execution, never a zero claim.
7. Unit stores primaryMatch, immutable P, current owner/cursor and sponsor-refund
   policy. Only primary Match contains refundable principal; secondary receipts are
   permanent settled records. Terminal instructions touch only the primary escrow,
   never every historical seller/payer.

Builders/installs/tests/validator remain PAUSED. Same existing lead and Goal; no
reset/replacement. Finite remaining docs: reconcile SPEC_V2; update WIRE_V2 account/
message/state tables; replace ACCEPTANCE_V2 cash-flow/recovery vectors; reconcile
all21 A/B/C dispositions; static consistency/hash check; freeze MANIFEST_V2 and
hand to existing reviewers for round2. No new broad research needed. ParentGO absent.
