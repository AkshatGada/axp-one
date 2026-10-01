import type { CSSProperties, ReactNode } from "react";
import { Provenance, MoneyStateMark, Amount } from "../foundation/marks";
import type { MoneyState } from "../foundation/provenance";
import { CheckMark } from "./primitives";

// ---------- The app ----------

/** A specimen of the publisher's chat UI. Its rounded frame is the one non-square shape: it depicts a third-party app. */
export function HostChat({ appName, caption, question, answer, answerMeta, slot, id, slotId }: { appName: ReactNode; caption?: ReactNode; question: ReactNode; answer: ReactNode; answerMeta?: ReactNode; slot: ReactNode; id?: string; slotId?: string }) {
  return (
    <figure className="lg-host" id={id} style={{ margin: 0 }}>
      <div className="lg-host-frame">
        <div className="lg-host-bar">
          <span>{appName}</span>
          <Provenance kind="replay" label="Recorded" quiet />
        </div>
        <div className="lg-host-body">
          <div className="lg-bubble-user">{question}</div>
          <div className="lg-answer" data-route-target="answer">
            {answerMeta ? <div className="lg-answer-meta">{answerMeta}</div> : null}
            {answer}
          </div>
          <div className="lg-host-rule" />
          <div className="lg-slot" id={slotId} data-route-target="slot">
            {slot}
          </div>
        </div>
      </div>
      {caption ? <figcaption className="lg-host-caption">{caption}</figcaption> : null}
    </figure>
  );
}

/** The disclosed Sponsored card exactly as approved. Destination URLs are shown as text, never linked. */
export function SponsoredCard({ text, advertiser, url, square, enter, note }: { text: string; advertiser: string; url: string; square?: boolean; enter?: boolean; note?: ReactNode }) {
  return (
    <div className={`lg-ad${enter ? " lg-ad-enter" : ""}`} data-square={square || undefined}>
      <div className="lg-ad-label">
        <span>Sponsored</span>
        <Provenance kind="fictional" label="Fictional advertiser" quiet />
      </div>
      <p className="lg-ad-text">{text}</p>
      <div className="lg-ad-foot">
        <span className="lg-ad-name">{advertiser}</span>
        <span className="lg-ad-url">{url.replace(/^https:\/\//, "").replace(/\/$/, "")}</span>
      </div>
      {note ? <div className="lg-small">{note}</div> : null}
    </div>
  );
}

export function AwaitingSlot({ children = "Sponsored slot, awaiting auction" }: { children?: ReactNode }) {
  return (
    <div className="lg-slot-await">
      <strong>{children}</strong>
    </div>
  );
}

/** No fill: never an empty ad box. A quiet publisher note under a complete answer. */
export function NoFillSlot({ children = "No sponsored placement for this turn" }: { children?: ReactNode }) {
  return (
    <div className="lg-nofill-note">
      <Provenance kind="policy" label="" />
      <span>{children}</span>
    </div>
  );
}

// ---------- Eligibility ----------
export type CapState = "declared" | "missing" | "required" | "soft";
export function CapabilityChips({ caps }: { caps: Array<{ name: string; state?: CapState }> }) {
  return (
    <span className="lg-caps">
      {caps.map((c) => (
        <span className="lg-cap" key={c.name} data-state={c.state}>
          {c.name}
        </span>
      ))}
    </span>
  );
}

export function EligibilityMatrix({ required, rows }: { required: string[]; rows: Array<{ name: ReactNode; declared: string[]; eligible: boolean; reason: ReactNode; key: string }> }) {
  return (
    <div className="lg-table-wrap lg-sheet">
      <table className="lg-table" data-boxed>
        <thead>
          <tr>
            <th>Campaign</th>
            {required.map((r) => (
              <th key={r}>
                <span className="lg-data-sm">{r}</span>
              </th>
            ))}
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td>
                <span className="lg-h3">{row.name}</span>
              </td>
              {required.map((r) => {
                const has = row.declared.includes(r);
                return (
                  <td key={r}>
                    <span className="lg-elig-cell">
                      <i className={has ? "lg-elig-yes" : "lg-elig-no"} aria-hidden>
                        {has ? "✓" : ""}
                      </i>
                      <span className="lg-small">{has ? "Declared" : "Not declared"}</span>
                    </span>
                  </td>
                );
              })}
              <td>
                <span className="lg-stack-sm" style={{ gap: 4 }}>
                  <span style={{ fontWeight: 500 }}>{row.eligible ? "May compete" : "Excluded"}</span>
                  <span className="lg-small">{row.reason}</span>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Evidence ----------
export function MethodBadge({ method, detail }: { method: "vector" | "lexical_fallback" | string; detail: ReactNode }) {
  const fallback = method !== "vector";
  return (
    <span className="lg-method" data-fallback={fallback || undefined}>
      <span className="lg-method-k">{fallback ? "Lexical fallback" : "Vector match"}</span>
      <span className="lg-method-v">{detail}</span>
    </span>
  );
}

export function ObservedRecord({ prompt, advertiser, creative, similarity, refNote = "Observed historical reference, not an axp.one advertiser", id, actions }: { prompt: string; advertiser: string; creative: string; similarity?: ReactNode; refNote?: ReactNode; id?: string; actions?: ReactNode }) {
  const body = creative.startsWith(advertiser) ? creative.slice(advertiser.length).trim() : creative;
  return (
    <article className="lg-observed" id={id}>
      <div className="lg-observed-meta">
        <Provenance kind="observed" label="Observed" />
        {similarity}
      </div>
      <p className="lg-observed-q">{prompt}</p>
      <p className="lg-observed-ad">
        <b>{advertiser}</b> {body}
      </p>
      <div className="lg-observed-meta">
        <span className="lg-ref-note">{refNote}</span>
        {actions}
      </div>
    </article>
  );
}

export function QualityFlags({ flags }: { flags: string[] }) {
  return (
    <span className="lg-flags">
      {flags.map((f) => (
        <span className="lg-flag" key={f}>
          {f}
        </span>
      ))}
    </span>
  );
}

export function InferredHint({ text, tier, flags, id }: { text: string; tier: ReactNode; flags?: string[]; id?: string }) {
  return (
    <div className="lg-hint" id={id}>
      <div className="lg-row" style={{ justifyContent: "space-between" }}>
        <Provenance kind="inferred" label="Inferred hint" />
        <span className="lg-small">{tier}</span>
      </div>
      <p>{text}</p>
      {flags && flags.length ? <QualityFlags flags={flags} /> : null}
    </div>
  );
}

export function NeighborList({ items }: { items: Array<{ similarity: number; text: ReactNode; key: string }> }) {
  return (
    <div className="lg-neighbors">
      {items.map((n) => (
        <div className="lg-neighbor" key={n.key}>
          <span>
            <span className="lg-data-sm">{n.similarity.toFixed(3)}</span>
            <span className="lg-simbar" aria-hidden>
              <i style={{ width: `${Math.max(0, Math.min(1, n.similarity)) * 100}%` }} />
            </span>
          </span>
          <span>{n.text}</span>
        </div>
      ))}
    </div>
  );
}

/** ContextHint evidence (vermillion) handed into an agent's decision (ultramarine). */
export function Handoff({ from = "ContextHint evidence", to }: { from?: ReactNode; to: ReactNode }) {
  return (
    <div className="lg-handoff" aria-label={`${typeof from === "string" ? from : "Evidence"} handed to ${typeof to === "string" ? to : "the agent"}`}>
      <div className="lg-handoff-rule" />
      <div className="lg-handoff-l">
        <b>{from}</b>
        <b>{to}</b>
      </div>
    </div>
  );
}

/** One agent's packet: the method, what it was shown, and the exact packet hash. */
export function EvidencePacket({ title, method, children, footer, id }: { title: ReactNode; method: ReactNode; children: ReactNode; footer?: ReactNode; id?: string }) {
  return (
    <section className="lg-sheet" id={id}>
      <div className="lg-sheet-head">
        <span className="lg-h3">{title}</span>
        <span className="lg-sheet-head-meta">{method}</span>
      </div>
      <div className="lg-sheet-pad lg-stack">{children}</div>
      {footer ? <div className="lg-receipt-foot">{footer}</div> : null}
    </section>
  );
}

// ---------- Decisions ----------
export type RulerMark = { value: number; kind: "baseline" | "history"; label: string };
/** A score on its scale with the rounding lines drawn. Levels are Math.round(score), so x.5 decides the level. */
export function ScoreRuler({ min = 0, max = 3, roundLines, keyLine, marks, caption, ticks }: { min?: number; max?: number; roundLines: number[]; keyLine?: number; marks: RulerMark[]; caption?: ReactNode; ticks?: number[] }) {
  const pos = (v: number) => `${((v - min) / (max - min)) * 100}%`;
  const tickVals = ticks ?? Array.from({ length: Math.round((max - min) / 0.5) + 1 }, (_, i) => min + i * 0.5).filter((v) => Number.isInteger(v));
  return (
    <div className="lg-ruler">
      <div className="lg-ruler-track" style={{ marginTop: 14 }}>
        <span className="lg-ruler-axis" />
        {tickVals.map((t) => (
          <span key={`t${t}`}>
            <span className="lg-ruler-tick" style={{ left: pos(t) }} />
            <span className="lg-ruler-tickl" style={{ left: pos(t) }}>
              {t}
            </span>
          </span>
        ))}
        {roundLines.map((r) => (
          <span key={`r${r}`} className="lg-ruler-round" data-key={r === keyLine || undefined} style={{ left: pos(r), top: r === keyLine ? -14 : 4 }}>
            {r === keyLine ? <span className="lg-ruler-roundl" data-flip={(r - min) / (max - min) > 0.7 || undefined}>{r.toFixed(1)} rounding line</span> : null}
          </span>
        ))}
        {marks.map((m) => (
          <span key={`${m.kind}${m.value}`} className="lg-ruler-mark" data-kind={m.kind} style={{ left: pos(m.value) }} title={`${m.label} ${m.value}`} />
        ))}
      </div>
      <div className="lg-ruler-legend">
        {marks.map((m) => (
          <span key={`l${m.kind}${m.value}`}>
            <i data-kind={m.kind} />
            {m.label} <span className="lg-data-sm">{m.value.toFixed(2)}</span>
          </span>
        ))}
        {caption ? <span>{caption}</span> : null}
      </div>
    </div>
  );
}

export function Verdict({ v }: { v: "bid" | "skip" | "abstain" | string }) {
  return (
    <span className="lg-verdict" data-v={v}>
      {v === "bid" ? "Bid" : v === "skip" ? "Skip" : "Abstain"}
    </span>
  );
}

export function DecisionCard({ verdict, levels, scores, creative, elapsed, tokens, role, footer, id }: { verdict: string; levels: string; scores: ReactNode; creative: ReactNode; elapsed: ReactNode; tokens: ReactNode; role?: ReactNode; footer?: ReactNode; id?: string }) {
  return (
    <div className="lg-decision" id={id}>
      <div className="lg-decision-top">
        <Verdict v={verdict} />
        <span className="lg-levels" title="relevance level : intent level">
          {levels}
        </span>
      </div>
      <div className="lg-small">{scores}</div>
      <div className="lg-small">{creative}</div>
      <div className="lg-decision-meta">
        <span className="lg-data-sm">{elapsed}</span>
        <span className="lg-data-sm">{tokens}</span>
      </div>
      {role ? <div className="lg-decision-role">{role}</div> : null}
      {footer}
    </div>
  );
}

/** The 3 x 2 grid: campaigns down, research arms across. */
export function DecisionGrid({ columns, rows }: { columns: Array<{ title: ReactNode; sub?: ReactNode; key: string }>; rows: Array<{ name: ReactNode; key: string; cells: ReactNode[] }> }) {
  return (
    <div className="lg-dgrid" style={{ ["--cols" as string]: columns.length } as CSSProperties}>
      <div className="lg-dgrid-h">Campaign</div>
      {columns.map((c) => (
        <div className="lg-dgrid-h" key={c.key}>
          {c.title}
          {c.sub ? <small>{c.sub}</small> : null}
        </div>
      ))}
      {rows.map((r) => [
        <div className="lg-dgrid-row-h" key={`${r.key}-h`}>
          {r.name}
        </div>,
        ...r.cells.map((cell, i) => (
          <div className="lg-dgrid-c" key={`${r.key}-${i}`}>
            {cell}
          </div>
        )),
      ])}
    </div>
  );
}

export function ArmDiff({ title, changed, children, ruler, id }: { title: ReactNode; changed: boolean; children: ReactNode; ruler?: ReactNode; id?: string }) {
  return (
    <div className="lg-armdiff" id={id}>
      <div className="lg-armdiff-top">
        <span className="lg-h3">{title}</span>
        <span className="lg-stamp" data-tone={changed ? undefined : "outline"} style={{ padding: "4px 10px", fontSize: 13 }}>
          {changed ? "Level changed" : "Unchanged"}
        </span>
      </div>
      {ruler}
      <p>{children}</p>
    </div>
  );
}

/** Frequency cap: the agent's answer stands on its own; the exchange's rule is a separate fact. */
export function NotAdmittedStamp({ detail }: { detail: ReactNode }) {
  return (
    <div className="lg-capstamp">
      <b>Agent said bid. Exchange did not admit it.</b>
      <span>{detail}</span>
    </div>
  );
}

// ---------- Auction ----------
export type BoardRow = { key: string; name: ReactNode; levels: ReactNode; formula: ReactNode; amount: ReactNode; status: ReactNode; winner?: boolean; out?: boolean };
export function AuctionBoard({ rows, floor, footer }: { rows: BoardRow[]; floor?: ReactNode; footer?: ReactNode }) {
  return (
    <div className="lg-board">
      <div className="lg-board-row" data-head>
        <span>Campaign</span>
        <span>Levels</span>
        <span>Max bid × table = bid</span>
        <span>Result</span>
      </div>
      {rows.map((r) => (
        <div className="lg-board-row" key={r.key} data-winner={r.winner || undefined} data-out={r.out || undefined}>
          <span className="lg-h3" style={{ color: "inherit" }}>
            {r.name}
          </span>
          <span className="lg-data">{r.levels}</span>
          <span className="lg-board-formula">
            {r.formula}
            {r.amount ? <b>{r.amount}</b> : null}
          </span>
          <span style={{ fontSize: 14 }}>{r.status}</span>
        </div>
      ))}
      {floor ? <div className="lg-board-floor">{floor}</div> : null}
      {footer ? <div className="lg-board-floor" style={{ borderTopStyle: "solid", borderTopColor: "var(--line-soft)" }}>{footer}</div> : null}
    </div>
  );
}

/** fit_intent_bid_v1: share of the max bid by level pair. */
export function BidTableGrid({ rows, active, maxBid, caption }: { rows: Array<{ levels: string; bps: number }>; active?: string[]; maxBid: string; caption?: ReactNode }) {
  return (
    <div className="lg-stack-sm">
      <span className="lg-small">
        {caption ?? (
          <>
            Bid table <span className="lg-data-sm">fit_intent_bid_v1</span>: share of the <Amount baseUnits={maxBid} /> max bid, by relevance:intent levels. Any lower level means no bid.
          </>
        )}
      </span>
      <div className="lg-bidtable">
        {rows.map((r) => (
          <div key={r.levels} data-active={active?.includes(r.levels) || undefined}>
            <span className="lg-label">Levels {r.levels}</span>
            <span className="lg-data">{r.bps / 100}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TieBreakNote({ children }: { children: ReactNode }) {
  return (
    <div className="lg-row" style={{ gap: 10 }}>
      <Provenance kind="policy" label="Tie-break" />
      <span className="lg-small" style={{ color: "var(--ink)" }}>
        {children}
      </span>
    </div>
  );
}

// ---------- Award, receipt, charge ----------
export function AwardTicket({ children, state, note }: { children: ReactNode; state: ReactNode; note?: ReactNode }) {
  return (
    <div className="lg-ticket">
      <div className="lg-stack">
        {children}
        {note ? <p className="lg-small" style={{ color: "var(--ink)" }}>{note}</p> : null}
      </div>
      <div>{state}</div>
    </div>
  );
}

export function ReceiptSheet({ title, meta, children, checks, caption }: { title: ReactNode; meta?: ReactNode; children: ReactNode; checks?: ReactNode; caption?: ReactNode }) {
  return (
    <div className="lg-receipt">
      <div className="lg-receipt-head">
        <span className="lg-h3">{title}</span>
        {meta}
      </div>
      <div className="lg-receipt-body">{children}</div>
      {checks || caption ? (
        <div className="lg-receipt-foot">
          {checks ? <div className="lg-receipt-checks">{checks}</div> : null}
          {caption ? <p className="lg-small">{caption}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

export function ChargeLine({ state, amount, meta }: { state: MoneyState; amount: string; meta: ReactNode }) {
  return (
    <div className="lg-chargeline">
      <MoneyStateMark state={state} />
      <span className="lg-small">{meta}</span>
      <span className="lg-data-lg">
        <Amount baseUnits={amount} />
      </span>
    </div>
  );
}

export function VoucherStep({ increment, cumulative, status, note }: { increment: string; cumulative: string; status: ReactNode; note?: ReactNode }) {
  return (
    <div className="lg-stack-sm">
      <div className="lg-voucher">
        <div>
          <span className="lg-label">Increment</span>
          <span className="lg-data-lg">
            +<Amount baseUnits={increment} />
          </span>
        </div>
        <div>
          <span className="lg-label">Cumulative authorization</span>
          <span className="lg-data-lg">
            <Amount baseUnits={cumulative} />
          </span>
        </div>
        <div>
          <span className="lg-label">Status</span>
          <span>{status}</span>
        </div>
      </div>
      {note ? <p className="lg-small">{note}</p> : null}
    </div>
  );
}

// ---------- Step rail ----------
export function StepRail({ children }: { children: ReactNode }) {
  return <ol className="lg-steprail" style={{ listStyle: "none", margin: 0, padding: 0 }}>{children}</ol>;
}
export function Step({ n, id, title, explain, aside, children, active, dim, collapsed }: { n: ReactNode; id: string; title: ReactNode; explain?: ReactNode; aside?: ReactNode; children?: ReactNode; active?: boolean; dim?: boolean; collapsed?: boolean }) {
  return (
    <li className="lg-step" id={id} data-active={active || undefined} data-dim={dim || undefined} data-collapsed={collapsed || undefined} data-step-anchor={id}>
      <span className="lg-step-node" data-step-node aria-hidden>
        {n}
      </span>
      <div className="lg-step-body">
        <div className="lg-step-head">
          <div className="lg-step-title">
            <h2 className="lg-h2">{title}</h2>
            {aside}
          </div>
          {explain ? <p className="lg-body">{explain}</p> : null}
        </div>
        {children}
      </div>
    </li>
  );
}

// ---------- Money ----------
export function ChannelMeter({ scale, segments, labels, legend }: { scale: number; segments: Array<{ state: MoneyState; value: number; label?: string; key: string }>; labels?: [ReactNode, ReactNode]; legend?: ReactNode }) {
  return (
    <div className="lg-meter">
      <div className="lg-meter-bar" role="img" aria-label={segments.map((s) => `${s.state} ${s.label ?? s.value}`).join(", ")}>
        {segments.map((s) => (
          <span key={s.key} className="lg-meter-seg" data-state={s.state} style={{ width: `${(s.value / scale) * 100}%` }}>
            {s.label && s.value / scale > 0.12 ? <span>{s.label}</span> : null}
          </span>
        ))}
      </div>
      {labels ? (
        <div className="lg-meter-scale">
          <span>{labels[0]}</span>
          <span>{labels[1]}</span>
        </div>
      ) : null}
      {legend ? <div className="lg-meter-legend">{legend}</div> : null}
    </div>
  );
}

export function CumulativeLadder({ rows }: { rows: Array<{ key: string; seq: ReactNode; what: ReactNode; increment: ReactNode; cumulative: ReactNode; superseded?: boolean; id?: string }> }) {
  return (
    <div className="lg-ladder">
      <div className="lg-ladder-row" data-head>
        <span>Seq</span>
        <span>Charge</span>
        <span>Increment</span>
        <span>Cumulative</span>
      </div>
      {rows.map((r) => (
        <div className="lg-ladder-row" key={r.key} id={r.id} data-superseded={r.superseded || undefined}>
          <span className="lg-data">{r.seq}</span>
          <span className="lg-small" style={{ color: "var(--ink)" }}>
            {r.what}
          </span>
          <span className="lg-data">{r.increment}</span>
          <span className="lg-data lg-ladder-cum">{r.cumulative}</span>
        </div>
      ))}
    </div>
  );
}

export function TxCard({ title, status, children, details, id }: { title: ReactNode; status: ReactNode; children: ReactNode; details?: Array<{ label: string; body: ReactNode }>; id?: string }) {
  return (
    <article className="lg-tx" id={id}>
      <div className="lg-tx-head">
        <span className="lg-h3">{title}</span>
        {status}
      </div>
      <div className="lg-tx-body">{children}</div>
      {details?.map((d) => (
        <details key={d.label}>
          <summary>{d.label}</summary>
          {d.body}
        </details>
      ))}
    </article>
  );
}

// ---------- Timelines ----------
export function LedgerTimeline({ groups }: { groups: Array<{ key: string; title: ReactNode; meta?: ReactNode; rows: Array<{ key: string; a: ReactNode; b: ReactNode; c: ReactNode; id?: string }> }> }) {
  return (
    <div className="lg-timeline">
      {groups.map((g) => (
        <div className="lg-tl-group" key={g.key}>
          <div className="lg-tl-ghead">
            <span className="lg-h3">{g.title}</span>
            {g.meta ? <span className="lg-small">{g.meta}</span> : null}
          </div>
          {g.rows.map((r) => (
            <div className="lg-tl-row" key={r.key} id={r.id}>
              <span className="lg-data-sm">{r.a}</span>
              <span className="lg-data-sm lg-muted">{r.b}</span>
              <span>{r.c}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ---------- Campaign ----------
export function CampaignSheet({ name, marks, children, id }: { name: ReactNode; marks?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <article className="lg-campaign" id={id}>
      <div className="lg-campaign-head">
        <span className="lg-h1" style={{ fontSize: 24 }}>
          {name}
        </span>
        {marks}
      </div>
      <div className="lg-campaign-body">{children}</div>
    </article>
  );
}

// ---------- Verify ----------
export function VerifyRow({ status, label, expected, actual, note, method }: { status: "pass" | "fail" | "skip" | "idle"; label: ReactNode; expected: ReactNode; actual: ReactNode; note?: ReactNode; method?: ReactNode }) {
  return (
    <div className="lg-verify-row" data-status={status}>
      <CheckMark state={status}>{""}</CheckMark>
      <span className="lg-stack-sm" style={{ gap: 2 }}>
        <span style={{ color: "var(--ink)", fontWeight: 500 }}>{label}</span>
        {method ? <span className="lg-small">{method}</span> : null}
        {note ? <span className="lg-small">{note}</span> : null}
      </span>
      <span className="lg-data-sm">{expected}</span>
      <span className="lg-data-sm" style={{ color: status === "fail" ? "var(--ink)" : undefined, fontWeight: status === "fail" ? 500 : undefined }}>
        {actual}
      </span>
    </div>
  );
}
