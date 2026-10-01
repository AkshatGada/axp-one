// The provenance vocabulary shared by Prospectus and Ledger. Every claim, number and object
// on either surface carries one of these kinds. Spec: docs/frontend/DESIGN_SYSTEMS.md.
export type ProvenanceKind =
  | "actual"
  | "observed"
  | "inferred"
  | "fictional"
  | "policy"
  | "settled"
  | "synthetic"
  | "replay"
  | "illustrative"
  | "vision";

export const PROVENANCE: Record<ProvenanceKind, { word: string; meaning: string }> = {
  actual: { word: "Actual output", meaning: "A real model or app-agent response in the recorded run." },
  observed: { word: "Observed", meaning: "A historical ContextHint observation: a real prompt or ad creative." },
  inferred: { word: "Inferred", meaning: "A ContextHint hypothesis about targeting, not a fact or an advertiser setting." },
  fictional: { word: "Fictional", meaning: "Declared by a fictional advertiser created for this demonstration." },
  policy: { word: "Policy", meaning: "A deterministic exchange rule: eligibility, caps, tie-break or no-fill." },
  settled: { word: "Settled", meaning: "A finalized settlement fact on the hosted Solana sandbox, in test USDC." },
  synthetic: { word: "Synthetic", meaning: "Laboratory or layout data. Never part of the recorded acceptance run." },
  replay: { word: "Recorded replay", meaning: "A read-only presentation of the saved run. Nothing executes again." },
  illustrative: { word: "Illustrative", meaning: "An explanation of how the exchange works, not a recorded event." },
  vision: { word: "Planned", meaning: "Part of the broader vision, not demonstrated in this MVP." },
};

export type MoneyState = "deposit" | "reserved" | "accepted" | "authorized" | "settled" | "refunded" | "pending" | "unknown";

export const MONEY_STATE: Record<MoneyState, string> = {
  deposit: "Deposit",
  reserved: "Reserved",
  accepted: "Accepted charge",
  authorized: "Authorized",
  settled: "Paid out",
  refunded: "Refunded",
  pending: "Pending",
  unknown: "Unknown",
};

/** Six-decimal base units (string) to a display amount. 4000 -> "0.004". Never floats for money. */
export function formatBaseUnits(baseUnits: string | number, decimals = 6): string {
  const s = String(baseUnits).replace(/^-/, "");
  const neg = String(baseUnits).startsWith("-");
  const padded = s.padStart(decimals + 1, "0");
  const whole = padded.slice(0, -decimals);
  let frac = padded.slice(-decimals).replace(/0+$/, "");
  if (frac.length < 3) frac = frac.padEnd(3, "0");
  return `${neg ? "-" : ""}${whole}.${frac}`;
}

export function shortHash(value: string, head = 6, tail = 4): string {
  return value.length <= head + tail + 1 ? value : `${value.slice(0, head)}…${value.slice(-tail)}`;
}
