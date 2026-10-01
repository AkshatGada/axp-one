// The build-time list of verify checks for this run (written by scripts/project-run.mjs into build-meta.json).
import meta from "./build-meta.json";

export const CHECK_IDS: string[] = meta.verify.ids;
export const CHECK_TOTAL = CHECK_IDS.length;
export const CHECKS_BY_METHOD = meta.verify.byMethod as { recomputed: number; signature: number; arithmetic: number; policy: number };
