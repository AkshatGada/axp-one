// The recorded run as one sheet: four opportunities in story order with their outcome, the scope
// chips and the manifest hash a judge can check.
import { Provenance } from "@axp/design-system/foundation";
import { RUN, usdc } from "@/data/run";

const REASON: Record<string, string> = {
  missing_constraint: "missing a required capability",
  frequency_cap: "frequency cap",
};

export function RunSheet() {
  return (
    <div className="sp-sheet">
      <div className="sp-sheet-head">
        <div className="sp-sheet-id">
          <span className="px-caption">Recorded run</span>
          <span className="px-num">{RUN.runId}</span>
        </div>
        <div className="sp-sheet-chips">
          <span className="px-chip">Hosted Solana sandbox</span>
          <span className="px-chip">Test USDC</span>
          <span className="px-chip">
            <Provenance kind="replay" />
          </span>
        </div>
      </div>
      <table className="sp-sheet-table">
        <thead>
          <tr>
            <th scope="col">Question, as asked</th>
            <th scope="col">Bids</th>
            <th scope="col">Outcome</th>
            <th scope="col">Receipt</th>
          </tr>
        </thead>
        <tbody>
          {RUN.turns.map((t) => {
            const r = RUN.receipts.find((x) => x.turn === t.id);
            return (
              <tr key={t.id}>
                <td className="q">{t.question}</td>
                <td>
                  {t.bids.length ? (
                    t.bids.map((b) => (
                      <div key={b.campaign}>
                        {b.name} <span className="px-num">{usdc(b.amount)}</span>
                      </div>
                    ))
                  ) : (
                    <span className="o">None</span>
                  )}
                </td>
                <td className="o">
                  {t.winner ? (
                    <>
                      <b>
                        {t.winnerName} at <span className="px-num">{usdc(t.price!)}</span>
                      </b>
                      {t.excluded.map((e) => `${e.name}: ${REASON[e.reason] ?? e.reason}`).join(". ")}
                    </>
                  ) : (
                    <>
                      <b>No fill</b>All {t.excluded.length} campaigns ruled out in code. No model calls.
                    </>
                  )}
                </td>
                <td>{r ? <span className="px-num">{r.receiptHash}</span> : <span className="o">None</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="sp-sheet-foot">
        <span>
          Manifest <span className="px-num">{RUN.manifestHashShort}</span>
        </span>
        <span>Story order. The no fill question ran first in the recorded run.</span>
      </div>
    </div>
  );
}
