# Phase 2 harness integration review

26 October 2026. Read-only review by local transport worker
01a176a4-2fd1-7662-a604-dd1e63a11a73, accepted gpt-6.1-sol/high settings. The core and
transport checkpoint is86ee6ec; the reviewed acceptance helpers were an active,
uncommitted snapshot. This is a finite integration review, not another architecture
audit or executed native acceptance. No processes, tests, RPC or edits were run by
the reviewer. Lead sent the five findings together to the harness owner for repair.

| ID | Priority | Observed defect | Required correction/proof |
|---|---|---|---|
| H1 | P1 | `phase2-acceptance-runtime.mjs` late read compares U7's returned hash to an absent earlier read, while the schedule intentionally skips that earlier read. | Bind first late recovery to finalized native responseHash; compare earlier read only when present; exercise both U0 and U7 paths. |
| H2 | P1 | `phase2-acceptance-plan.mjs` reconstructs a resumed race intent from the now-advanced Unit cursor, conflicting with the durable original intent. | Recover original cursor/descriptors from checkpoint before observing current state; interruption after a winner must not create a new intent/signature. |
| H3 | P2 | `phase2-acceptance-fence.mjs` always creates its fixed input with exclusive create, so resume after input creation fails EEXIST. | Validate/reuse original input and retained fence/outbox; never recreate a fresh fence to pass recovery. |
| H4 | P2 | The runtime resume shortcut completes recovered native steps with an empty proof list, permanently dropping required T8 crash markers. | Recover persisted marker/original-attempt evidence before marking the step complete. |
| H5 | P2 | Cancellation refusal after signing/restart/reconciliation is labeled a cancellation/signing race. | Keep it as sequential guard evidence; use a controlled pair of genuinely concurrent W6 requests for race evidence or leave that proof pending. |

At this record's creation, fixes and focused offline regressions are pending lead
verification. Native execution remains blocked by the separately paused toolchain
prerequisite. No finding is closed merely because a source edit is authored.


## Scoped closure verification

The same independent reviewer checked only H1–H5 against final source and ran the
existing21-test offline acceptance suite:21 passed, zero failures/skips. All five
are closed at source level:

- H1: runtime line452 checks the finalized native responseHash and only compares
  an earlier read when present.
- H2: plan line150 restores the saved race intent; recovery retains original
  descriptors and compares progress to the original cursor.
- H3: fence line40 validates/reuses existing input; an existing DB is observed
  without a new fence. Missing process-exit evidence stays pending.
- H4: runtime line179 recovers original crash markers and rebuilds required proof
  IDs before completing the resumed step.
- H5: plan line357 launches both W6 requests and waits for both gates before
  release. Sequential post-restart refusal does not receive race credit.

These checks establish source/offline predicate, marker, input-reuse and gate-order
closure. They do NOT establish actual native execution, full service SIGKILL
recovery, concurrent HTTP race outcomes or exact deadline execution. The reviewer
made no edits or runtime/network calls and is idle. Runtime coverage remains pending.
