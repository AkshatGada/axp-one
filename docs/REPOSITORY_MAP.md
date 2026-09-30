# Repository and domain map

Verified locally 2026-09-30. Remote information is local Git configuration, not
proof of the current Vercel deployment's configured branch or project.

| Purpose | Local path | Relationship |
|---|---|---|
| Existing marketing website repo | /Users/akshat/axp-one-site | remote https://github.com/AkshatGada/axp-site.git |
| Website motion redesign | /Users/akshat/axp-one-motion-redesign | worktree of that same website repo; branch codex/axp-motion-from-personal |
| Agent-facing ad experiments + latest prior MVP | /Users/akshat/axp-agent-ad-experiments/protocol | worktree of website repo, branch codex/axp-agent-ad-experiments; protocol subdirectory |
| Preserved protocol baseline | /Users/akshat/axp-protocol-baseline | separate worktree of website repo |
| Original standalone access-core folder | /Users/akshat/axp-access-core | historical sponsored-access implementation, not this repo |
| New exchange/DSP project | /Users/akshat/agentic-dsp | standalone fresh local Git repo on main, no remote |

Old website main checkout is on codex/axp-v3-unfinished-snapshot. Its local
origin/main snapshot uses styles/motion-redesign.css, matching the motion
worktree's neutral steel direction. This does not establish current live assets.

## New separation

The new repo starts from scratch: no old paywall code, page content, experiments,
database or configuration imported. Existing repos are untouched references.
Only shared design tokens and founder-owned local font assets are transferred.

Proposed future app roots in new repo:

- apps/backend: financial and exchange authority.
- apps/reference-ui: main builder's plain functional product demo.
- apps/product-ui: final dashboard/chat UI owned by specialist.
- apps/marketing: separate new homepage owned by specialist at the end.
- design-system: shared neutral style/font foundation, not marketing content.

Marketing and product clients are separate build roots and do not contain a
second backend/ledger. Their final route/subdomain deployment is deferred to
the user and frontend agent. Do not assume a Vercel root directory before
actual app manifests/builds exist.

Domain intention confirmed by user: reuse axp.one and eventually replace the
existing public site. The domain, Vercel project, old site and DNS are not
changed during planning. Keep the old site recoverable until an explicit release.
