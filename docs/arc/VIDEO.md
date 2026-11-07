# AXP × Arc submission video

The revised version 2 film is **3 minutes 18 seconds**, **1920×1080**, **30 fps**, H.264
MP4 with AAC narration and optional English captions. There is **no music**.

Local downloadable export (ignored; do not commit the media):

`local-state/arc/video/v2/AXP-Arc-Continuity-Demo-v2.mp4`

Version 2 uses a different male voice (George), gives AXP a 45-second opening
explanation, and adds quiet chapter pauses. Speech is not time-stretched. The
original Roger version remains at `local-state/arc/video/AXP-Arc-Continuity-Demo.mp4`.

The narration is calm and product-focused. It shows the advertiser's campaign,
the independent answer and separate Sponsored card, accepted delivery, app
earnings, the actual Arc Studio project/preview, a product-flow diagram and the
real Arc Explorer transaction. It identifies AXP as a pre-existing product and
Arc Nanopayments as the new Mumbai work. It contains no voice-service attribution,
code tour, private key, raw payment signature, nonce or storage walkthrough.

- [Final narration](video/NARRATION.md)
- [Storyboard](video/STORYBOARD.md)
- [Product flow SVG](video/product-flow.svg)
- Optional captions: `local-state/arc/video/v2/AXP-Arc-Continuity-Demo-v2.srt`

## Factual boundaries

The UI captures come from actual AXP, Arc Studio and Arc Explorer. Provider
fixture/testnet labels remain visible. Product interactions were not accelerated.
The edit uses captured views and a product diagram, with deliberate holds timed
to narration. It is an edited walkthrough, not an uninterrupted live session.

One new actual delivery was captured, creating its original 0.002 test-USDC
signed authorization. The final submission click was blocked by automatic UI
approval review; no payment request was sent by that click. That authorization
was preserved during the parent task's hosting handoff. It is not presented as
finalized in the film.

Settlement proof is explicitly the earlier **recorded two-payment batch**:
2 × 0.002 = 0.004 test USDC. The Explorer shot shows its successful transaction:
`0xcc2e5aabe8828064e2b89064f7f649ac5116edb6eeba091fd1728d76a6dcea7f`.
No new deposit, mainnet action, withdrawal or refund is implied.

## Export review

- Duration, resolution, video/audio/caption streams verified with ffprobe.
- Entire encoded MP4 decoded without errors.
- Representative frames inspected across the final encoded film, including the new introduction.
- Narration timing checked against its character alignment and scene cuts.
- Revision reuses the original UI evidence and performs no new financial action.
- Revised encoded audio measures −16.51 LUFS integrated and −4.34 dBFS true peak,
  with no clipping. Final measurements are retained in the ignored local QA record.
- Studio's actual preview was restored through its own Restart dev server control.
  The shot excludes the personal account footer and unrelated browser tabs.
- The final file has not been uploaded or submitted. The human reviews the file
  and uploads it to ETHGlobal before the stated 9:00 AM IST deadline.
