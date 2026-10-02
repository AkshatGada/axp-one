# axp.one live Devnet demo video

- `axp-live-demo.mp4`: 4:15.5 (255.5 s), 1920x1080, 60 fps, H.264 High (crf 18, yuv420p, BT.709 limited range, faststart), no audio, 24.1 MB (24,085,870 bytes).
- `axp-live-demo.srt` / `axp-live-demo.vtt`: the 11 Present captions (text from `apps/product-ui` `scripts/beats-to-srt.mjs`, identical to the build's `public/present.srt`), shifted by +15.5 s for the intro; the last cue runs to the end of the video.
- `poster.png`: 1920x1080 frame from Present beat 1 ("People ask AI apps what to buy").

## Structure
| Time | Content |
|---|---|
| 0:00 to 0:16.3 | Landing intro: `http://localhost:3410/?film=1` (hero line reveal, scroll into "Behind one Sponsored card, a whole exchange", the stack settles). 0.4 s fade in from black. |
| 0:15.5 to 0:16.3 | 0.8 s crossfade into Present |
| 0:15.5 to 4:15.5 | Present mode autoplay, `http://localhost:3420/present/?auto=1`: all 11 beats of the live Solana Devnet run, 240 s, captions in its own bar, cursor hidden. 1.2 s fade to black at the end. |

Chapter starts (s): 15, 30, 45, 67, 89, 114, 139, 164, 186, 216, 241. Measured beat changes in the take were within 0.15 s of the nominal timings.

## Source
Branch `frontend`, re-recorded 2026-10-02 from the dev servers at commit be9d82c (tags `axp-mvp-v7` and `axp-landing-v7.1`). Present rendered `run.public.json` with `network.kind = devnet` (header "Replay of a live Solana Devnet run, Oct 1", "Devnet test USDC, fictional advertisers"). Captions regenerated from that build's `public/present.srt` (beat 5 now ends "One run, not a benchmark.").

## How it was made (`tools/`)
1. `take.mjs <n>`: playwright-core with system Chrome (headless), viewport 1920x1080, DPR 1. Each page is warmed once in a throwaway context (dev compile), then loaded fresh; fonts awaited. Frames are captured with CDP `Page.startScreencast` (JPEG q93, every frame, Chrome's own frame timestamps) rather than Playwright `recordVideo`, whose fixed VP8 1 Mbit/s encode blocked up text during the intro's motion. Present beat changes (URL hash), frame visibility, cursor state and fit zoom are logged every 100 ms.
2. `assemble.mjs`: drops the blank pre-paint frame (first content frame by size), writes an ffconcat list with per-frame durations from the timestamps, resamples to 60 fps CFR, H.264 crf 18.
3. `final.sh`: intro (16.3 s) + Present (240 s), xfade 0.8 s, fades, `-movflags +faststart`.
4. `subs.mjs`: SRT + VTT with the +15.5 s offset.

Takes: two earlier takes (take 1 used; take 2 aborted because :3420 was down) predate v7. This file is take 3, on v7. It was checked by sampling a frame every 5 s (52 frames) and looking at each: no blank frames, no stuck beats, no layout shifts, every beat on its own title and caption, fit zoom 1.70 to 1.90, beat changes within 0.2 s of the nominal timings.

The landing (`apps/marketing/scripts/extract-specimens.mjs`) copies the MP4, poster and a dash-free VTT into `apps/marketing/public/media/` at dev/build time.
