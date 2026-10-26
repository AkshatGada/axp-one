# Selected v2 economic model — frozen review candidate 03

26 October2026. Latest root direction ADOPTED; no correctness objection to its stated
terms. This replaces the former contingent full-chain model, which remains comparison
history only. This version is frozen for independent review, not audit approval
or implementation GO.

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
   Sponsored primary procurement has explicit fixed-price provenance; it is not a
   competitive-book winner claim and shares the same atomic Unit availability guard.
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
   Issuance permits only (transferable,maxTransfers)=(0,0) or (1,1..3). Effective
   resale rights are zero for nontransferable/sponsored units; otherwise subtract
   post-fill transferCount. Both matching directions, signers and native Fund check
   the ordinary primary/secondary buyer's signed minimum. Sponsored Fund minimum is0.
7. Unit stores primaryMatch, immutable P, current owner/cursor and sponsor-refund
   policy. Only primary Match contains refundable principal; secondary receipts are
   permanent settled records. Terminal instructions touch only the primary escrow,
   never every historical seller/payer.

Builders, installations, tests and validator work remain PAUSED. This planning
packet is complete for independent review; its manifest binds these exact bytes.
No Goal controls were used for this phase. The completed Round Two reports are
preserved; focused verification of Packet03 corrections and explicit root GO remain
required. The planning handoff distinguishes proposed corrections from
unexecuted validation; no implementation approval is implied.
