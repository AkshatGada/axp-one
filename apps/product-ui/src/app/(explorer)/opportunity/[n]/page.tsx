import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Provenance } from "@axp/design-system/ledger";
import { opportunity, run, usdc, nameOf } from "@/data/select";
import type { Opportunity } from "@/data/types";
import {
  AppSpecimen,
  ArmDiffs,
  AuctionStep,
  AwardStep,
  ChargeStep,
  DecisionsGrid,
  DeliveryStep,
  EligibilityStep,
  EvidenceHook,
  EvidencePanel,
  LeatherGuardLine,
  MomentStep,
  NoFillCollapsed,
  PolicyLine,
  ReceiptStep,
  RepeatRulers,
  SlotAwaiting,
  SlotNoFill,
  WinnerCard,
} from "@/components/opportunity/parts";
import { ReplayChip, SlotSwitch, StartButton, StepShell, StepThrough, type StepDef } from "@/components/opportunity/StepThrough";
import { Tabs } from "@/components/opportunity/Tabs";

export function generateStaticParams() {
  return run.opportunities.map((o) => ({ n: String(o.n) }));
}

export async function generateMetadata({ params }: { params: Promise<{ n: string }> }): Promise<Metadata> {
  const { n } = await params;
  const o = run.opportunities.find((x) => String(x.n) === n);
  return { title: o ? `Opportunity ${o.n}: ${o.question}` : "Opportunity" };
}

const ALL_STEPS: Array<Omit<StepDef, "n">> = [
  { id: "moment", title: "The moment", target: "answer" },
  { id: "eligibility", title: "Who may compete", target: "slot" },
  { id: "evidence", title: "What each agent was shown", target: "slot" },
  { id: "decisions", title: "What each agent decided", target: "slot" },
  { id: "auction", title: "Auction", target: "slot" },
  { id: "award", title: "Award (not a charge yet)", target: "slot" },
  { id: "delivery", title: "Delivery", target: "slot" },
  { id: "receipt", title: "Signed receipt", target: "slot" },
  { id: "charge", title: "Charge and voucher", target: "slot" },
];

function stripItems(o: Opportunity): Array<{ id: string; k: string; v: string }> {
  if (o.status === "no_fill")
    return [
      { id: "moment", k: "Required", v: o.mandatoryCapabilities.join(" + ") },
      { id: "eligibility", k: "May compete", v: `0 of ${run.campaigns.length}` },
      { id: "nofill", k: "Agent calls", v: "0" },
      { id: "nofill", k: "Outcome", v: "No fill" },
      { id: "nofill", k: "Charged", v: "nothing" },
    ];
  const bids = o.auction.bids;
  const amounts = Array.from(new Set(bids.map((b) => usdc(b.amountBaseUnits))));
  return [
    { id: "eligibility", k: "May compete", v: `${o.eligibility.eligible.length} of ${run.campaigns.length}` },
    { id: "evidence", k: "Evidence", v: o.decisions.find((d) => d.retrieval)?.retrieval?.method === "vector" ? "vector match" : "lexical fallback" },
    { id: "decisions", k: "Agent calls", v: String(o.decisions.length) },
    { id: "auction", k: "Bids", v: bids.length > 1 && amounts.length === 1 ? `${bids.length} × ${amounts[0]}` : bids.map((b) => usdc(b.amountBaseUnits)).join(", ") },
    { id: "award", k: "Winner", v: `${nameOf(o.award!.campaignId)}${o.auction.tieBreakApplied ? ", tie-break" : o.auction.notAdmitted.length ? ", cap applied" : ""}` },
    { id: "receipt", k: "Receipt", v: "signed" },
    { id: "charge", k: "Charged", v: usdc(o.charge!.amountBaseUnits) },
  ];
}

export default async function OpportunityPage({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const num = Number(n);
  if (!run.opportunities.some((x) => x.n === num)) notFound();
  const o = opportunity(num);
  const noFill = o.status === "no_fill";
  const steps: StepDef[] = (noFill ? ALL_STEPS.slice(0, 2) : ALL_STEPS).map((s, i) => ({ ...s, n: i + 1 }));
  const prev = num > 1 ? num - 1 : null;
  const next = num < run.opportunities.length ? num + 1 : null;
  const historyDecisions = o.decisions.filter((d) => d.arm === "history" && d.retrieval);
  const explain = {
    evidence: "Each agent received its own packet: past observations from ContextHint and inferred targeting hints. Evidence informs the judgment; it cannot add a capability.",
    decisions: "Each agent answered in levels: relevance (does the approved card fit this question?) and commercial intent (is the person comparing offers?). A level is the rounded score.",
    auction: "Code turns levels into a bid: a share of the campaign's max bid from the bid table. The highest bid wins; the model never names a price.",
    award: "The winner's card is reserved for the slot.",
    delivery: "The app inserted the approved card with its Sponsored label and acknowledged it.",
    receipt: "The app signed what it did, with its own key.",
    charge: "Only an accepted, signed delivery becomes a charge. The charge advances the advertiser's payment channel.",
  };
  return (
    <StepThrough steps={steps}>
      <header className="op-head">
        <div className="op-head-top">
          <span className="lg-row" style={{ gap: 14 }}>
            <span className="lg-label" style={{ color: "var(--ink)" }}>
              Opportunity {o.n} of {run.opportunities.length}
            </span>
            <Provenance kind="replay" />
          </span>
          <StartButton />
        </div>
        <h1 className="lg-display op-question">{o.question}</h1>
        <nav className="op-strip" aria-label="Outcome">
          {stripItems(o).map((s, i) => (
            <a key={`${s.id}-${i}`} href={`#${s.id}`}>
              <span>{s.k}</span>
              <span className={/\d/.test(s.v) ? "lg-data-sm" : undefined}>{s.v}</span>
            </a>
          ))}
        </nav>
      </header>

      <div className="op-grid">
        <aside className="op-app" aria-label="In the app">
          <div className="op-app-label">
            <span className="lg-label" style={{ color: "var(--ink)" }}>
              In the app
            </span>
            <span className="lg-small">The answer never receives advertiser material.</span>
          </div>
          <AppSpecimen o={o} slot={noFill ? <SlotNoFill /> : <SlotSwitch deliveredFrom={6} card={<WinnerCard o={o} />} awaiting={<SlotAwaiting />} />} />
        </aside>

        <div className="op-rail">
          <span className="lg-label" style={{ color: "var(--ink)" }}>
            Behind the answer
          </span>
          <ReplayChip />
          <ol className="lg-steprail" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            <StepShell index={0} id="moment" n={1} title="The moment" explain="The app offered one Sponsored slot beside its answer. Only these fields reach the exchange.">
              <MomentStep o={o} />
            </StepShell>
            <StepShell index={1} id="eligibility" n={2} title="Who may compete" explain="Eligibility is a rule in code, checked before any agent is asked. A campaign must declare every required capability.">
              <EligibilityStep o={o} />
            </StepShell>
            {noFill ? (
              <li id="nofill" className="lg-step" data-collapsed>
                <span className="lg-step-node" aria-hidden>
                  3
                </span>
                <div className="lg-step-body">
                  <NoFillCollapsed o={o} />
                </div>
              </li>
            ) : (
              <>
                <StepShell index={2} id="evidence" n={3} title="What each agent was shown" explain={explain.evidence}>
                  <EvidenceHook o={o} />
                  <Tabs
                    label="Evidence packet by campaign"
                    tabs={historyDecisions.map((d) => ({ key: `${o.n}-${d.campaignId}`, label: nameOf(d.campaignId), panel: <EvidencePanel o={o} d={d} /> }))}
                  />
                </StepShell>
                <StepShell index={3} id="decisions" n={4} title="What each agent decided" explain={explain.decisions}>
                  <DecisionsGrid o={o} />
                  {o.scenarioId === "repeat" ? <RepeatRulers o={o} /> : <ArmDiffs o={o} />}
                  {o.scenarioId !== "repeat" ? <PolicyLine o={o} /> : null}
                  <LeatherGuardLine o={o} />
                </StepShell>
                <StepShell index={4} id="auction" n={5} title="Auction" explain={explain.auction}>
                  <AuctionStep o={o} />
                </StepShell>
                <StepShell index={5} id="award" n={6} title="Award (not a charge yet)" explain={explain.award}>
                  <AwardStep o={o} />
                </StepShell>
                <StepShell index={6} id="delivery" n={7} title="Delivery" explain={explain.delivery}>
                  <DeliveryStep o={o} />
                </StepShell>
                <StepShell index={7} id="receipt" n={8} title="Signed receipt" explain={explain.receipt}>
                  <ReceiptStep o={o} />
                </StepShell>
                <StepShell index={8} id="charge" n={9} title="Charge and voucher" explain={explain.charge}>
                  <ChargeStep o={o} />
                </StepShell>
              </>
            )}
          </ol>
          <nav className="op-nav" aria-label="Opportunities">
            {prev ? (
              <Link className="lg-btn" data-variant="outline" href={`/opportunity/${prev}/`}>
                <span className="lg-arrow">←</span> Opportunity {prev}
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link className="lg-btn" href={`/opportunity/${next}/`}>
                Opportunity {next} <span className="lg-arrow">→</span>
              </Link>
            ) : (
              <Link className="lg-btn" href="/settlement/">
                Settlement <span className="lg-arrow">→</span>
              </Link>
            )}
          </nav>
        </div>
      </div>
    </StepThrough>
  );
}
