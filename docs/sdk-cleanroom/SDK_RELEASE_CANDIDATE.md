# Publisher SDK release candidate

## Package contract

`@axp001/publisher-sdk@0.2.1` packages the existing publisher protocol for
installation in an independent AI app. The SDK alone is MIT licensed; this does
not relicense AXP's backend, data or historical artifacts. Registry publication
has not occurred.

| Entry point | Role |
| --- | --- |
| `@axp001/publisher-sdk` | Server-authenticated requests, acknowledgements and read-only recovery |
| `/browser` | Plain-text Sponsored card, DOM observation and acknowledgement deduplication |
| `/react` | Compiled React 19 adapter and declarations; React is an optional peer |
| `/financial` | Explicit financial modes, denominations and chain-evidence presentation |
| `/receipt` | Structural validation bound to the expected award |

Node.js 22.18+ and ESM are required. The package has no runtime dependencies;
non-React apps need not install React. Fourteen explicitly allowlisted files
contain the runtime modules, declarations, README, package manifest and license.
TSX source, historical guides, backend code, credentials and test artifacts are
not shipped. The historical 0.2.0 tarball is unchanged.

Account-owned app keys use an explicit `/api/accounts/sdk` base URL supplied by
the enabled AXP deployment. The constructor's legacy `/api/product` default is
preserved for compatibility, not presented as the account-owned endpoint.
See the [package guide](../../packages/publisher-sdk/README.md).

## Reproduce preparation and verification

```sh
pnpm install --frozen-lockfile --ignore-scripts
node scripts/sdk/build-react.mjs
node scripts/sdk/build-react.mjs --check
node --test tests/publisher-sdk/*.test.mjs
node --test tests/accounts-release-preflight.test.mjs
node scripts/test.mjs
```

The React build uses repository build-time TypeScript tooling, not a consumer
dependency. The checked-in JavaScript must match its source. Consumer tests pack
the exact allowlist, install it into a clean directory with lifecycle scripts
disabled, import all public entries, render the React component without a TSX
loader, and typecheck strict NodeNext and Bundler resolution. SSR rendering checks
do not replace browser DOM/receipt acceptance.

Candidate verification on 12 October 2026:

- 47 publisher SDK tests passed on Node 22.18.0 and Node 24.8.0.
- 63 configuration/health-preflight tests passed without live provider calls.
- Repository regression: 798 passed, 23 optional skipped, zero failed (821 total).
- Product UI TypeScript check and 35 projection/verification tests passed. The
  UI tests require generating the read-only recorded-run projection first with
  `node apps/product-ui/scripts/project-run.mjs` in a fresh checkout.

The regression requires loopback HTTP listeners. Optional SDK/provider-dependent
checks remain explicit skips; they are not counted as successful integrations.
No chain broadcasts, funded accounts, paid model calls or registry publication
are implied by these results.

## Account release sequence

1. Verify an isolated account Preview's exact origin, dedicated Supabase project,
   private durable state binding, encryption and disabled broadcasts using the
   [read-only preflight](../accounts/RELEASE_PREFLIGHT.md). Namespace separation
   alone does not prove that a cloud storage binding is isolated.
2. Complete fresh advertiser and app-owner signup, email confirmation, profile
   persistence, sign-out and cross-owner isolation against that actual Preview.
3. Connect the advertiser's approved campaign and the app's own SDK credential;
   verify one accepted insertion/charge, recovery, revocation and no-fill. Local
   fixture tests are distinct from actual hosted auction/model availability.
4. Exercise genuine wallet-extension ownership signatures only, including prompt
   rejection and binding persistence. Operator-key signatures are not this check.
5. Have a fresh integrator repeat the hosted journey using only the package guide
   and scoped credentials, then freeze the exact source/artifact and evidence.
6. Test a native funded lifecycle only under separate explicit budget and broadcast
   authority. This is outside the current no-funds authorization.

Stages 1–5 remain hosted acceptance gates, not claims established by package
tests. The existing landing page and shared demo are separate release surfaces.

## Registry release gate

Publishing remains deliberately blocked by `prepublishOnly` while account
authentication and final artifact checks are pending. Do not bypass 2FA, publish
a placeholder, or use `--ignore-scripts` as a publication workaround. Once
authorized authentication is ready, remove the guard in a reviewed release
change, rebuild and repack, inspect the final contents/integrity, and publish
that exact candidate with public scoped access. Then verify registry metadata
and install from the registry in a fresh consumer before documenting npm
installation as available. Scope permission must be verified with the actual
publishing identity; a browser screenshot is not CLI authentication.

References: [scoped public packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/)
and [npm publishing authentication](https://docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification/).
