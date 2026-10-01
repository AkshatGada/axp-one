"use client";
// Synthetic campaign draft: validation mirrors the exchange's saveCampaign; eligibility and bid use the ported rules.
import { useMemo, useState } from "react";
import { Ld } from "@axp/design-system/ledger";
import { CAPABILITIES, DRAFT_LIMITS, computeBid, reason, validateDraft } from "@/lib/policy.ts";
import { formatBaseUnits } from "@axp/design-system/foundation";

export type TryOpp = {
  n: number;
  label: string;
  required: string[];
  coarseIntent: string;
  destination: string;
  floor: string;
  publisherId: string;
  refLevels: { relevance: number; intent: number; from: string } | null;
  recordedWinner: string | null;
};
type Preset = { name: string; creative: string; hints: string; maxBid: string; cap: string; caps: string[]; funded: boolean };
const plain = (s: string) => s.replace(/_/g, " ").replace(/\brfid\b/gi, "RFID");

export function TryApp({ opps, presets }: { opps: TryOpp[]; presets: Preset[] }) {
  const [name, setName] = useState("Northwind Vault");
  const [creative, setCreative] = useState("Northwind Vault is a fictional hardware wallet for people who want offline keys and simple recovery.");
  const [hints, setHints] = useState("First hardware wallet, offline key storage.");
  const [maxBid, setMaxBid] = useState("3000");
  const [cap, setCap] = useState("6000");
  const [caps, setCaps] = useState<string[]>(["crypto_storage", "hardware_wallet", "offline_key_storage"]);
  const [funded, setFunded] = useState(true);
  const [levels, setLevels] = useState<Record<number, { r: number; i: number; borrowed: boolean }>>(() =>
    Object.fromEntries(opps.map((o) => [o.n, { r: o.refLevels?.relevance ?? 2, i: o.refLevels?.intent ?? 2, borrowed: !!o.refLevels }])),
  );
  const errors = validateDraft({ businessName: name, creative, contextHints: hints, maxBidBaseUnits: maxBid, budgetCapBaseUnits: cap, declaredConstraints: caps });
  const err = (f: string) => errors.find((e) => e.field === f)?.message;
  const valid = errors.length === 0;
  const rows = useMemo(
    () =>
      opps.map((o) => {
        const c = { campaignId: "draft", status: "active", allowedIntents: ["crypto_wallet_tools"], destination: "global", declaredConstraints: caps, maxBidBaseUnits: valid ? maxBid : "0" };
        const r = reason(c, { coarseIntent: o.coarseIntent, destination: o.destination, taskConstraints: o.required, floorBaseUnits: o.floor, publisherId: o.publisherId }, { channel: { publisherId: o.publisherId, status: funded ? "open" : "pending_open" }, sessionAwards: 0, available: { campaign: valid ? cap : "0", channel: funded ? "20000" : "0" } });
        const lv = levels[o.n];
        const bid = !r && valid ? computeBid({ decision: lv.r >= 2 && lv.i >= 2 ? "bid" : "skip", relevanceLevel: lv.r, commercialIntentLevel: lv.i }, { maxBidBaseUnits: maxBid }, cap, "20000", o.floor) : null;
        return { o, r, lv, bid, missing: o.required.filter((x) => !caps.includes(x)) };
      }),
    [opps, caps, maxBid, cap, funded, levels, valid],
  );
  const load = (p: Preset) => {
    setName(`${p.name} (copy)`);
    setCreative(p.creative);
    setHints(p.hints);
    setMaxBid(p.maxBid);
    setCap(p.cap);
    setCaps(p.caps);
    setFunded(p.funded);
  };
  const toggleCap = (c: string) => setCaps((xs) => (xs.includes(c) ? xs.filter((x) => x !== c) : [...xs, c]));
  const reasonWords: Record<string, string> = {
    missing_constraint: "Excluded: missing a required capability",
    channel_unavailable: "Excluded at auction: no funded channel",
    below_floor: "Excluded: max bid below the floor",
    budget_unavailable: "Excluded: budget below the floor",
    frequency_cap: "Excluded: frequency cap",
    policy_excluded: "Excluded: topic not allowed",
    campaign_paused: "Excluded: paused",
  };
  return (
    <div className="try2-grid">
      <Ld.Panel title="Your draft" sub="Limits mirror the exchange's campaign validation" actions={<span className="ld-row" style={{ gap: 6 }}>{presets.map((p) => <Ld.Button key={p.name} variant="secondary" size="sm" onClick={() => load(p)}>{`Start from ${p.name}`}</Ld.Button>)}</span>}>
        <div className="ld-stack">
          <Ld.Field label="Business name" error={err("businessName")}>
            <input className="ld-input" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!err("businessName")} />
          </Ld.Field>
          <Ld.Field label="Creative" hint={`${creative.length} of ${DRAFT_LIMITS.creative} characters`} error={err("creative")}>
            <textarea className="ld-textarea" value={creative} onChange={(e) => setCreative(e.target.value)} />
          </Ld.Field>
          <Ld.Field label="Targeting hints" hint={`${hints.length} of ${DRAFT_LIMITS.contextHints} characters`} error={err("contextHints") ?? err("packet")}>
            <textarea className="ld-textarea" style={{ minHeight: 60 }} value={hints} onChange={(e) => setHints(e.target.value)} />
          </Ld.Field>
          <div className="ld-cols-2">
            <Ld.Field label="Max bid, base units" hint={`${/^\d+$/.test(maxBid) ? formatBaseUnits(maxBid) : "?"} test USDC; at most 4,000`} error={err("maxBidBaseUnits")}>
              <input className="ld-input" inputMode="numeric" value={maxBid} onChange={(e) => setMaxBid(e.target.value.trim())} aria-invalid={!!err("maxBidBaseUnits")} />
            </Ld.Field>
            <Ld.Field label="Budget cap, base units" hint={`${/^\d+$/.test(cap) ? formatBaseUnits(cap) : "?"} test USDC; at most 8,000`} error={err("budgetCapBaseUnits")}>
              <input className="ld-input" inputMode="numeric" value={cap} onChange={(e) => setCap(e.target.value.trim())} aria-invalid={!!err("budgetCapBaseUnits")} />
            </Ld.Field>
          </div>
          <div className="ld-stack" style={{ gap: 6 }}>
            <span className="ld-field-l">Declared capabilities</span>
            <span className="ld-row" style={{ gap: 6 }}>
              {CAPABILITIES.map((c) => (
                <button key={c} type="button" className="try2-cap" aria-pressed={caps.includes(c)} onClick={() => toggleCap(c)}>
                  {plain(c)}
                </button>
              ))}
            </span>
          </div>
          <button type="button" role="switch" aria-checked={funded} className="ld-toggle" data-on={funded || undefined} onClick={() => setFunded((v) => !v)} style={{ border: 0, background: "none", padding: 0, font: "inherit", justifySelf: "start" }}>
            <span className="ld-toggle-track" aria-hidden />
            <span>Funded channel</span>
          </button>
          {valid ? <Ld.Tag tone="success" dot>Draft passes the campaign limits</Ld.Tag> : <Ld.Tag tone="danger" dot>{`${errors.length} limit${errors.length > 1 ? "s" : ""} not met`}</Ld.Tag>}
        </div>
      </Ld.Panel>
      <div className="ld-stack" style={{ gap: 12 }}>
        {rows.map(({ o, r, lv, bid, missing }) => (
          <Ld.Panel key={o.n} title={`${o.n}. ${o.label}`} sub={`Requires ${o.required.map(plain).join(" and ")}; floor ${formatBaseUnits(o.floor)} USDC`} actions={r ? <Ld.Tag tone="dashed">Excluded</Ld.Tag> : <Ld.Tag tone="brand">May compete</Ld.Tag>}>
            {r ? (
              <span className="ld-secondary" style={{ color: "var(--ld-text)" }}>
                {reasonWords[r] ?? r}
                {r === "missing_constraint" ? `: ${missing.map(plain).join(", ")}.` : "."}
              </span>
            ) : (
              <div className="ld-stack" style={{ gap: 10 }}>
                <div className="ld-row" style={{ gap: 16 }}>
                  {(["r", "i"] as const).map((k) => (
                    <label key={k} className="ld-row" style={{ gap: 8 }}>
                      <span className="ld-label">{k === "r" ? "Relevance level, of 3" : "Intent level, of 3"}</span>
                      <select className="ld-select" style={{ width: 70, height: 30 }} value={lv[k]} onChange={(e) => setLevels((s) => ({ ...s, [o.n]: { ...s[o.n], [k]: Number(e.target.value), borrowed: false } }))}>
                        {[0, 1, 2, 3].map((x) => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                  {lv.borrowed && o.refLevels ? <Ld.Tag tone="warning">{`Borrowed from ${o.refLevels.from}'s recorded agent`}</Ld.Tag> : null}
                </div>
                {lv.borrowed ? <span className="ld-caption">Borrowed levels: your campaign was never evaluated by an agent. Reference: another campaign's recorded agent output.</span> : null}
                <div className="ld-between">
                  <span className="ld-secondary" style={{ color: "var(--ld-text)" }}>
                    {bid && bid.status === "bid"
                      ? `Bid table: ${formatBaseUnits(maxBid)} USDC × ${(bid.bps ?? 0) / 100}% = ${formatBaseUnits(bid.amountBaseUnits)} USDC (test)`
                      : bid
                        ? `No bid: ${bid.reason === "agent_skip" ? "the bid rule needs at least 2 and 2" : bid.reason.replace(/_/g, " ")}`
                        : "No bid"}
                  </span>
                  {o.recordedWinner ? <span className="ld-caption">Recorded winning price here: {o.recordedWinner}</span> : null}
                </div>
              </div>
            )}
          </Ld.Panel>
        ))}
        <span className="ld-caption">Not simulated: agent judgment, evidence retrieval, auction against other bids, awards, delivery, receipts, charges and settlement. The same exchange code runs locally as a synthetic laboratory, with model providers off by default: npm run demo:v3.</span>
      </div>
    </div>
  );
}
