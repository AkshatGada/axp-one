# Pinned native payment source

Public MIT source from Solana Foundation PayKit commit
`c294f8903f18efc746584e3cc2961d6033b8365c`, package `@solana/mpp` version
`0.11.0`. The upstream `LICENSE` is retained verbatim.

Only the 67 runtime TypeScript modules used in the tested artifact, original
package manifest and lockfile are included, not the whole monorepo. `manifest.json`
records source hashes, original emitted hashes and exact dependency metadata.
The original lockfile includes unrelated upstream workspace references; the
bounded builder never installs that workspace or its unrelated packages.

`locked-packages.json` freezes the 72 previously tested runtime dependencies,
their exact versions, registry archive locations and integrity values. Their
installed files are generated under ignored `local-state/phase4-sdk`.

Build with the repository's pinned compiler using the standalone setup runbook.
No source, compiler or wallet is loaded from another project.
