# Studio evidence preview

Read-only public companion to the real [Arc Studio project](https://studio.arc.io/app/0c07e997-5564-4b38-94f9-099ea3e95393).
Source was selected from the Studio-generated frontend and reviewed before copying.
It displays sanitized recorded AXP evidence; its optional live checks make public
GET requests to Gateway. It cannot sign, fund, settle, or serve a live AXP chat.

For deployment the unnecessary wallet providers, backend, signing SDK, development
trace capture and polyfills were removed. The watermark/provenance remain.
The root site build publishes only this viewer's `dist` at `/arc/` without private
state, `.env`, or wallet files. It can also be deployed alone using only this
directory; a separate Vercel project was not connected.

```sh
npm ci --ignore-scripts --no-audit --no-fund --prefix tooling/arc-preview
npm run build --prefix tooling/arc-preview
```

The functional frontend/backend demonstration runs separately with `npm run arc:demo`.
See [the runbook](../../docs/arc/README.md) and [Studio provenance](../../docs/arc/STUDIO.md).
