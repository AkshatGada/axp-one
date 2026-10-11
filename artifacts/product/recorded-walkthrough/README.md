# Advertiser and publisher product walkthrough

The 1080p recording at `/demo/` captures actual browser interactions with the
hosted product, in a separate recording workspace. It leaves the live judge
workspace's three prepared advertisers available for the presentation.

The flow creates HarborKey using editable Tab suggestions, declares buying
context and capabilities, approves its exact Sponsored card, sets spending
limits, and opens a finalized Solana Devnet test-USDC payment channel. A fresh
DeepSeek answer runs in the example publisher chat; Jev evaluates the four
eligible campaigns using advertiser inputs and retrieved ContextHint evidence.
The exchange awards HarborKey at 0.003 test USDC. Its actual DOM insertion and
Sponsored disclosure produce an accepted signed receipt and cumulative voucher.
Replaying that receipt leaves delivery count and spend unchanged.

The recording then returns to the advertiser dashboard and closes the channel:
0.003 test USDC is paid to the publisher and 0.017 is refunded. Both opening and
closing transactions finalized. Public signatures and amounts are preserved in
`acceptance.json`. The three unused recording deposits were subsequently returned;
all four recording channels are closed. These are Devnet test tokens.

The encoded MP4, captions and poster are under `apps/marketing/public/video/`.
The original MVP recording remains available separately. Browser interactions
were recorded with Playwright at 1920 × 1080, then encoded as H.264 with MP4
fast-start and an English subtitle track. The website adds chapter navigation
through the existing design system's `VideoFigure` component.

The current presentation cut runs 1:53 (112.80 seconds). It removes repeated idle
holds from the original 2:42 capture while keeping the full frame and chronological
workflow at recorded speed. Channel-opening finality, the independent answer
loading, receipt-replay response and channel-settlement waits remain intact.
Captions and chapter positions follow the edited timeline. This edit does not
change the dated execution, amounts, signatures or timestamps in `acceptance.json`.
