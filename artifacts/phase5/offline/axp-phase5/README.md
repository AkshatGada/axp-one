# AXP offline evidence replay

Original run: phase4-20261001-acceptance. Original network: official Solana payment sandbox. Presentation: recorded evidence replay, not fresh execution.

Requires existing Node22+ and npm. No npm install, providers, database, Docker, credentials, wallet or network sandbox needed.

```sh
npm run verify
npm run demo:replay
```

Open http://127.0.0.1:8790 in a browser. Previous/Next or left/right arrows move through the story. If the port is in use, set AXP_REPLAY_PORT=8791. Stop with Ctrl-C.

Read docs/build/PHASE5_RUNBOOK.md. Video, SRT, narration and original-frame evidence are under artifacts/phase5/recording. The silent captioned240-second video is an edited browser frame-hold walkthrough, not a continuous recording of paid execution. The sandbox may reset; use the saved account/transaction evidence, not permanent explorer availability.

Frontend contracts/client/fixtures: docs/frontend/SETUP.md. No financial authority or private spending vouchers in browser code. Final design and public release are separate.
