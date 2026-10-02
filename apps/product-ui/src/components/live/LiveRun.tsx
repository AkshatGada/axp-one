"use client";
// "Run it live": starts a real run on Solana Devnet through the hosted live-run API, shows it advancing with the same
// Ledger components as the recorded runs, inserts each Sponsored card in this page and acknowledges delivery from this
// page's own DOM, then settles. When the API is absent (static hosting), the page says so and nothing else breaks.
import { useCallback, useEffect, useRef, useState } from "react";
import { Ld } from "@axp/design-system/ledger";
import { acknowledgeCard, createLiveClient, driveRun, LiveRunError } from "@/lib/live-client.mjs";
import type { AwardStatus, LiveClient, LiveConfig, PaymentStatus, Phase, RunListItem, RunRecord, TurnStatus } from "@/lib/live-client.mjs";
import { usdcText as usdc, capWords } from "@/lib/narrative.ts";
import { asset } from "@/lib/paths";
import SAMPLE from "@/data/live-sample.json";

/** Where judges can start a real run: the hosted MVP with the live-run API. */
const HOSTED_LIVE_URL = process.env.NEXT_PUBLIC_HOSTED_LIVE_URL || "https://axp.one/mvp/live/";
const finishedWords = (iso: string) => `${new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}, ${new Date(iso).toISOString().slice(11, 16)} UTC`;

/** No live API behind this page: never a dead end. Link the hosted site (unless this is it) and a finished live run. */
function NoLiveService() {
  const [here, setHere] = useState(false);
  useEffect(() => {
    try {
      setHere(new URL(HOSTED_LIVE_URL).origin === window.location.origin);
    } catch {
      setHere(false);
    }
  }, []);
  const sample = SAMPLE as { runId: string | null; finishedAt?: string };
  return (
    <div className="ld-stack-lg" style={{ gap: 16 }}>
      {here ? (
        <Ld.Callout tone="warning" title="The live service is not answering right now">
          Starting a run needs the live-run service, and it did not respond. Try again in a few minutes; meanwhile, open the finished live run below.
        </Ld.Callout>
      ) : (
        <Ld.Panel title="Start a live run on axp.one" sub="This copy of the MVP is a static site, so it cannot start a run itself." actions={<Ld.Tag tone="brand">Solana Devnet</Ld.Tag>}>
          <div className="ld-stack" style={{ gap: 12 }}>
            <span className="ld-secondary">The hosted MVP runs the whole exchange live: four questions, Jev decisions, auctions, Sponsored cards checked in your browser, and payment channels settled on Solana Devnet. Devnet test USDC; nothing of value moves.</span>
            <span>
              <a className="ld-btn ld-btn--primary" href={HOSTED_LIVE_URL} target="_blank" rel="noopener noreferrer">
                Run it live on axp.one ↗
              </a>
            </span>
          </div>
        </Ld.Panel>
      )}
      {sample.runId ? (
        <Ld.Panel title="Open a finished live run" sub={`Finished ${sample.finishedAt ? finishedWords(sample.finishedAt) : "on Oct 1"}, on Solana Devnet`}>
          <div className="ld-stack" style={{ gap: 12 }}>
            <span className="ld-secondary">A run started through the live-run service in our end-to-end test: a browser page showed each Sponsored card and confirmed it was there, the app signed the receipts, and both channels opened and closed on Devnet. Its saved bundle is projected and checked in your browser, with Explorer links for every transaction.</span>
            <span>
              <a className={`ld-btn ${here ? "ld-btn--primary" : "ld-btn--secondary"}`} href={asset(`/live/run/?id=${encodeURIComponent(sample.runId)}`)}>
                Open the finished live run
              </a>
            </span>
          </div>
        </Ld.Panel>
      ) : null}
      <span className="ld-caption">Everything else here works without the service: the replayed run, Present and Verify.</span>
    </div>
  );
}

const PHASES: Array<{ id: Phase; label: string; value: string }> = [
  { id: "queued", label: "Queued", value: "Run admitted" },
  { id: "opening", label: "Answers", value: "App answers; channels open" },
  { id: "auctions", label: "Decisions", value: "Jev decides; auctions" },
  { id: "delivery", label: "Delivery", value: "Cards in your browser" },
  { id: "closing", label: "Settlement", value: "Channels close" },
  { id: "finalizing", label: "Record", value: "Bundle written" },
  { id: "completed", label: "Done", value: "Ready to open" },
];
const SCENARIO: Record<string, string> = { cached: "Cheapest hardware wallet", offline: "Offline key storage", repeat: "Same question again", mobile: "Mobile-only wallets" };
const ORDER = ["cached", "offline", "repeat", "mobile"];
const SESSION = "axp.live.current";
const LIVE_API = process.env.NEXT_PUBLIC_LIVE_API === "1";
const short = (s: string, h = 8, t = 6) => (s.length > h + t + 1 ? `${s.slice(0, h)}…${s.slice(-t)}` : s);
const ERRORS: Record<string, string> = {
  live_runs_disabled: "Live runs are switched off on this server right now.",
  passcode_invalid: "That passcode is not right.",
  busy_retry: "Another start is being admitted. Try again in a few seconds.",
  live_run_in_progress: "A run is in progress by someone else. Only one runs at a time; try again in a few minutes.",
  daily_cap_reached: "Today's live runs are used up. Try again tomorrow, or open a finished run below.",
  ip_daily_cap_reached: "This network has used its live runs for today. Open a finished run below.",
  origin_rejected: "The live service rejected this page's origin.",
  card_not_in_document: "The card was not in the page when delivery was acknowledged.",
  sponsored_label_missing: "The Sponsored label was missing from the card, so delivery was not acknowledged.",
  creative_text_mismatch: "The card text did not match the approved creative, so delivery was not acknowledged.",
};
const words = (e: unknown) => {
  const code = e instanceof LiveRunError ? e.code : e instanceof Error ? e.message : String(e);
  return ERRORS[code] ?? `The live service returned "${code}".`;
};

type Store = { runId: string; token: string | null };
const readStore = (): Store | null => {
  try {
    const v = sessionStorage.getItem(SESSION);
    return v ? (JSON.parse(v) as Store) : null;
  } catch {
    return null;
  }
};
const writeStore = (v: Store | null) => {
  try {
    if (v) sessionStorage.setItem(SESSION, JSON.stringify(v));
    else sessionStorage.removeItem(SESSION);
  } catch {
    /* private mode: the token then lives in memory only */
  }
};
const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function LiveRun() {
  const client = useRef<LiveClient | null>(null);
  const [avail, setAvail] = useState<"probing" | "absent" | "ready">("probing");
  const [config, setConfig] = useState<LiveConfig | null>(null);
  const [runs, setRuns] = useState<RunListItem[]>([]);
  const [passcode, setPasscode] = useState("");
  const [run, setRun] = useState<RunRecord | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [acks, setAcks] = useState<Record<string, { state: "inserted" | "acknowledging" | "signed" | "failed"; receiptHash?: string; note?: string }>>({});
  const abort = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    const c = client.current!;
    const [cfg, list] = await Promise.all([c.config(), c.list().catch(() => [] as RunListItem[])]);
    setConfig(cfg);
    setRuns(list);
  }, []);

  // Probe: is there a live API behind this page?
  useEffect(() => {
    client.current = createLiveClient();
    let live = true;
    // Only builds made for the hosted site (NEXT_PUBLIC_LIVE_API=1) look for the API; a static copy never probes.
    if (!LIVE_API) {
      setAvail("absent");
      return;
    }
    client.current
      .config()
      .then(async (cfg) => {
        if (!live) return;
        if (cfg?.schemaVersion !== "axp.hosted-live-config.v1") throw new Error("not the live API");
        setConfig(cfg);
        setAvail("ready");
        setRuns(await client.current!.list().catch(() => []));
        const s = readStore();
        if (s) {
          const r = await client.current!.status(s.runId).catch(() => null);
          if (r && live) {
            setRun(r);
            setToken(s.token);
            if (!r.terminal) void loop(s.runId, s.token);
          }
        }
      })
      .catch(() => live && setAvail("absent"));
    return () => {
      live = false;
      abort.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Advance until terminal; at delivery, insert each card here and acknowledge it from this page's DOM. */
  const loop = useCallback(async (runId: string, tok: string | null) => {
    const c = client.current!;
    abort.current?.abort();
    const ctl = new AbortController();
    abort.current = ctl;
    try {
      for (;;) {
        const r = await driveRun(c, runId, { intervalMs: 2000, onUpdate: (x) => setRun(x), signal: ctl.signal });
        setRun(r);
        if (r.terminal) break;
        if (r.phase === "delivery" && r.pendingAwards.length) {
          if (!tok) {
            setError("This run was started in another browser tab or window. Only that one can show the cards and acknowledge delivery; undelivered cards are never charged.");
            break;
          }
          const awards = (r.status?.awards ?? []).filter((a) => r.pendingAwards.includes(a.awardId));
          setAcks((m) => ({ ...m, ...Object.fromEntries(awards.map((a) => [a.awardId, { state: "inserted" as const }])) }));
          await frame();
          await wait(900); // let the card be seen before it is acknowledged
          for (const a of awards) {
            const el = document.querySelector(`[data-live-award="${a.awardId}"] [data-sponsored-card]`);
            setAcks((m) => ({ ...m, [a.awardId]: { state: "acknowledging" } }));
            try {
              const res = await acknowledgeCard(c, runId, tok, a, el as Element);
              setAcks((m) => ({ ...m, [a.awardId]: { state: "signed", receiptHash: res.receipt.receiptHash } }));
              setRun(res.run);
            } catch (e) {
              setAcks((m) => ({ ...m, [a.awardId]: { state: "failed", note: words(e) } }));
            }
          }
        }
      }
    } catch (e) {
      if (!ctl.signal.aborted) setError(words(e));
    } finally {
      void refresh().catch(() => {});
    }
  }, [refresh]);

  const start = async () => {
    setError(null);
    setStarting(true);
    try {
      const res = await client.current!.start({ passcode: passcode || undefined, idempotencyKey: crypto.randomUUID() });
      setRun(res.run);
      setToken(res.runToken);
      setAcks({});
      writeStore({ runId: res.run.runId, token: res.runToken });
      void loop(res.run.runId, res.runToken);
    } catch (e) {
      setError(words(e));
      void refresh().catch(() => {});
    } finally {
      setStarting(false);
    }
  };
  const reset = () => {
    abort.current?.abort();
    writeStore(null);
    setRun(null);
    setToken(null);
    setAcks({});
    setError(null);
    void refresh().catch(() => {});
  };

  if (avail === "probing")
    return (
      <Ld.Panel title="Checking the live service">
        <span className="ld-secondary">Looking for the live-run API behind this page.</span>
      </Ld.Panel>
    );
  if (avail === "absent") return <NoLiveService />;

  const busy = !!config && config.activeRuns.length >= config.caps.maxActive && !(run && config.activeRuns.includes(run.runId));
  const capped = !!config && config.usedToday >= config.caps.daily;
  const canStart = !!config?.enabled && !busy && !capped && !run;
  const phaseIx = run ? PHASES.findIndex((p) => p.id === run.phase) : -1;
  const names: Record<string, string> = Object.fromEntries((run?.status?.turns ?? []).flatMap((t) => t.decisions.map((d) => [d.campaignId, d.advertiser])));
  const turns = (run?.status?.turns ?? []).slice().sort((a, b) => ORDER.indexOf(a.scenarioId) - ORDER.indexOf(b.scenarioId));

  return (
    <div className="ld-stack-lg lv-root" style={{ gap: 16 }}>
      {!run ? (
        <Ld.Panel
          title="Start a live run"
          sub={config ? `${config.usedToday} of ${config.caps.daily} runs used today; one run at a time. Organic answers by ${config.models.organic}, decisions by ${config.models.decisions}.` : undefined}
          actions={<Ld.Tag tone={config?.enabled ? "success" : undefined} dot>{config?.enabled ? "Live runs on" : "Live runs paused"}</Ld.Tag>}
        >
          <div className="ld-stack" style={{ gap: 12 }}>
            {!config?.enabled ? (
              <Ld.Callout title="Live runs are paused on this server">
                {config?.configured.liveEnabled === false ? "The operator has not switched live runs on." : !config?.configured.wallets ? "The Devnet wallets are not set up." : !config?.configured.payersFunded ? "The payer wallets need test funds." : !config?.configured.modelKeys ? "The model keys are missing." : "Try again later."} The finished runs below still open.
              </Ld.Callout>
            ) : null}
            {busy ? <Ld.Callout tone="warning" title="A run is in progress by someone else">Only one live run happens at a time. It usually finishes in a minute or two; try again then.</Ld.Callout> : null}
            {capped ? <Ld.Callout tone="warning" title="Today's live runs are used up">The daily limit keeps test funds available for everyone. Open a finished run below.</Ld.Callout> : null}
            {config?.passcodeRequired ? (
              <label className="ld-field">
                <span className="ld-label">Passcode</span>
                <input className="ld-input" type="password" autoComplete="off" value={passcode} onChange={(e) => setPasscode(e.target.value)} />
              </label>
            ) : null}
            <div className="ld-row" style={{ gap: 12 }}>
              <Ld.Button disabled={!canStart || starting || (config?.passcodeRequired && !passcode)} onClick={() => void start()}>
                {starting ? "Starting" : "Start a live run"}
              </Ld.Button>
              <span className="ld-caption">Four questions, three fictional advertisers, Devnet test USDC. Nothing of value moves.</span>
            </div>
          </div>
        </Ld.Panel>
      ) : (
        <>
          <Ld.Panel
            title={run.terminal ? (run.phase === "completed" ? "The run is complete" : run.phase === "aborted" ? "The run stopped" : "The run needs the operator") : "Running on Solana Devnet"}
            sub={<span className="ld-mono">{run.runId}</span>}
            actions={
              run.terminal ? (
                <Ld.Button variant="secondary" size="sm" onClick={reset}>
                  Start over
                </Ld.Button>
              ) : (
                <Ld.Tag tone="brand" dot>
                  {PHASES[Math.max(0, phaseIx)]?.label ?? run.phase}
                </Ld.Tag>
              )
            }
          >
            <Ld.Pipeline
              keys={false}
              active={Math.max(0, phaseIx)}
              stages={PHASES.map((p, i) => ({ id: p.id, label: p.label, value: i < phaseIx || run.phase === "completed" ? "Done" : i === phaseIx ? p.value : "Upcoming", status: run.phase === "aborted" && i > phaseIx ? ("skipped" as const) : i <= phaseIx || run.phase === "completed" ? ("done" as const) : ("upcoming" as const) }))}
            />
          </Ld.Panel>
          {run.phase === "aborted" || run.phase === "needs_operator" ? (
            <Ld.Callout tone="danger" title={run.phase === "aborted" ? `Stopped: ${run.abortReason ?? run.error?.code ?? "aborted"}` : `Waiting for the operator: ${run.error?.code ?? "a chain step"}`}>
              No card that was not delivered is charged. Each channel still closes: it pays only the delivered, signed cards and refunds the rest of its deposit to the payer.{run.phase === "needs_operator" ? " The operator reconciles the chain step without signing anything new." : ""}
            </Ld.Callout>
          ) : null}
        </>
      )}

      {error ? (
        <Ld.Callout tone="danger" title="Something needs attention">
          {error}
        </Ld.Callout>
      ) : null}

      {run?.status ? (
        <>
          <Ld.Panel title="Questions, answers and decisions" sub="The app answers first, with no advertiser material; then each advertiser's agent decides with Jev and code runs the auction.">
            <div className="lv-turns">
              {turns.map((t) => (
                <TurnCard key={t.scenarioId} t={t} names={names} />
              ))}
            </div>
          </Ld.Panel>
          {(run.status.awards ?? []).length ? (
            <Ld.Panel title="Delivery, in this page" sub="Each winning card is inserted here. This page checks the Sponsored label and the exact approved text in its own DOM, then the app signs a receipt. Only then is the charge accepted.">
              <div className="lv-cards">
                {run.status.awards
                  .slice()
                  .sort((x, y) => ORDER.indexOf(x.scenarioId ?? "") - ORDER.indexOf(y.scenarioId ?? ""))
                  .map((a) => (
                  <AwardCard key={a.awardId} a={a} t={turns.find((x) => x.outcome?.awardId === a.awardId)} ack={acks[a.awardId]} charge={run.status!.charges.find((c) => c.awardId === a.awardId)} />
                ))}
              </div>
            </Ld.Panel>
          ) : null}
          {(run.status.payments ?? []).length ? (
            <Ld.Panel title="Settlement on Solana Devnet" sub="One payment channel per advertiser: one open, off-chain vouchers, one close. Explorer links appear as transactions land." flush>
              <div className="lv-pay">
                {run.status.payments.map((p) => (
                  <PaymentRow key={p.channelId} p={p} />
                ))}
              </div>
            </Ld.Panel>
          ) : null}
        </>
      ) : null}

      {run?.phase === "completed" ? (
        <Ld.Callout tone="brand" title="Open this run">
          The full record of this run: every question, decision, auction, receipt and transaction, with the browser checks.{" "}
          <a className="ld-btn ld-btn--primary ld-btn--sm" href={asset(`/live/run/?id=${encodeURIComponent(run.runId)}`)}>
            Open this run
          </a>
        </Ld.Callout>
      ) : null}

      {runs.length ? (
        <Ld.Panel title="Recent live runs" sub="Newest first. Finished runs open with the full record." flush>
          <Ld.Table
            columns={[
              { key: "id", head: "Run", cell: (r: RunListItem) => <span className="ld-mono">{short(r.runId, 18, 6)}</span> },
              { key: "at", head: "Started", cell: (r) => new Date(r.createdAt).toISOString().slice(0, 16).replace("T", " ") + " UTC" },
              { key: "p", head: "State", cell: (r) => <Ld.Tag tone={r.phase === "completed" ? "success" : r.terminal ? "warning" : "brand"} dot>{r.phase.replace(/_/g, " ")}</Ld.Tag> },
              { key: "c", head: "Paid deliveries", num: true, cell: (r) => r.charges },
              { key: "o", head: "", cell: (r) => (r.phase === "completed" ? <a className="ld-link" href={asset(`/live/run/?id=${encodeURIComponent(r.runId)}`)}>Open</a> : <span className="ld-faint">not finished</span>) },
            ]}
            rows={runs}
          />
        </Ld.Panel>
      ) : null}
    </div>
  );
}

const REASON: Record<string, string> = { missing_constraint: "missing a required capability", frequency_cap: "frequency cap", policy_excluded: "intent not allowed", channel_unavailable: "no funded channel" };
function TurnCard({ t, names }: { t: TurnStatus; names: Record<string, string> }) {
  const hist = t.decisions.filter((d) => d.arm === "history");
  const winner = t.outcome?.awardId ? t.outcome.bids[0] : null;
  return (
    <div className="lv-turn" data-state={t.status}>
      <div className="ld-between">
        <span className="ld-card-title">{SCENARIO[t.scenarioId] ?? t.scenarioId}</span>
        <Ld.Tag tone={t.outcome ? (t.outcome.status === "awarded" ? "brand" : "dashed") : undefined}>{t.outcome ? (t.outcome.status === "awarded" ? "Filled" : "No fill") : t.status === "waiting_organic" ? "Waiting for the answer" : "Deciding"}</Ld.Tag>
      </div>
      <span className="ld-secondary">“{t.question}”</span>
      <div className="lv-answer">{t.organic?.status === "completed" ? <p>{t.organic.answer}</p> : <span className="ld-faint">The app is answering…</span>}</div>
      {hist.length ? (
        <ul className="lv-dec">
          {hist.map((d) => (
            <li key={d.campaignId}>
              <span className="ld-strong">{d.advertiser}</span>
              <span className="ld-caption">{d.decision ? `${d.decision}${d.relevanceLevel != null ? `, relevance ${d.relevanceLevel}, intent ${d.commercialIntentLevel}` : ""}` : d.status.replace(/_/g, " ")}</span>
            </li>
          ))}
        </ul>
      ) : t.excluded.length && t.status !== "waiting_organic" ? (
        <span className="ld-caption">No agent asked: {t.excluded.length === 3 ? "every campaign was" : `${t.excluded.length} campaigns were`} excluded by rule.</span>
      ) : null}
      {t.excluded.length && hist.length ? <span className="ld-caption">Excluded by rule: {t.excluded.map((x) => `${names[x.campaignId] ?? x.campaignId.replace(/^v3-/, "")} (${REASON[x.reason] ?? capWords(x.reason)})`).join(", ")}</span> : null}
      {t.outcome ? (
        <span className="ld-secondary" style={{ color: "var(--ld-text)" }}>
          {t.outcome.status === "awarded" && winner
            ? t.outcome.bids.length > 1
              ? t.outcome.bids.every((b) => b.amountBaseUnits === winner.amountBaseUnits)
                ? `Tie at ${usdc(winner.amountBaseUnits)} USDC; the tie rule picks ${winner.advertiser}.`
                : `${t.outcome.bids.map((b) => `${b.advertiser} ${usdc(b.amountBaseUnits)}`).join(", ")} USDC; ${winner.advertiser} wins.`
              : `${winner.advertiser} was the only bidder at ${usdc(winner.amountBaseUnits)} USDC.`
            : "No bid reached the auction; no ad, and the answer still served."}
        </span>
      ) : null}
    </div>
  );
}

function AwardCard({ a, t, ack, charge }: { a: AwardStatus; t?: TurnStatus; ack?: { state: string; receiptHash?: string; note?: string }; charge?: { amountBaseUnits: string; status: string; receiptHash: string } }) {
  const shown = a.status === "delivered" || !!ack;
  const state = charge ? "Charged" : ack?.state === "signed" ? "Receipt signed" : ack?.state === "acknowledging" ? "Acknowledging" : ack?.state === "failed" ? "Not acknowledged" : a.status === "failed" || a.status === "expired" ? "Not delivered, not charged" : shown ? "Inserted" : "Waiting";
  return (
    <div className="lv-card" data-live-award={a.awardId}>
      <div className="ld-chat">
        <div className="ld-chat-bar">
          <span>Demo AI app (the publisher)</span>
          <Ld.Tag tone={charge ? "success" : ack?.state === "failed" ? "danger" : "brand"} dot>
            {state}
          </Ld.Tag>
        </div>
        <div className="ld-chat-body">
          {t ? <div className="ld-chat-q">{t.question}</div> : null}
          {shown ? <Ld.SponsoredCard enter text={a.creativeText} advertiser={a.advertiser} url="" /> : <div className="ld-await">Sponsored slot, awaiting delivery</div>}
        </div>
      </div>
      <span className="ld-caption">
        {a.advertiser} won at {usdc(a.priceBaseUnits)} USDC.{" "}
        {charge ? `Receipt ${short(charge.receiptHash, 10, 6)} signed; ${usdc(charge.amountBaseUnits)} USDC charged.` : ack?.receiptHash ? `Receipt ${short(ack.receiptHash, 10, 6)} signed.` : ack?.note ?? ""}
      </span>
    </div>
  );
}

function PaymentRow({ p }: { p: PaymentStatus }) {
  const Ext = ({ href, children }: { href: string | null; children: React.ReactNode }) =>
    href ? (
      <a className="ld-link" href={href} target="_blank" rel="noopener noreferrer">
        {children} ↗
      </a>
    ) : (
      <span className="ld-faint">{children}: pending</span>
    );
  const last = p.vouchers[p.vouchers.length - 1];
  return (
    <div className="lv-payrow">
      <div className="ld-stack" style={{ gap: 2 }}>
        <span className="ld-strong">{p.advertiser}</span>
        <span className="ld-caption">
          Deposit {usdc(p.depositBaseUnits)} USDC{last ? `; voucher ${p.vouchers.length}: ${usdc(last.cumulativeAmountBaseUnits)} in total` : ""}
          {p.closeStatus ? `; paid ${usdc(p.settledBaseUnits)}, refunded ${usdc(p.refundBaseUnits)}` : ""}
        </span>
      </div>
      <div className="ld-row" style={{ gap: 12, flexWrap: "wrap" }}>
        <Ext href={p.explorer.payer}>Payer</Ext>
        <Ext href={p.explorer.channel}>Channel</Ext>
        <Ext href={p.explorer.open}>Open</Ext>
        <Ext href={p.explorer.close}>Close</Ext>
      </div>
    </div>
  );
}
