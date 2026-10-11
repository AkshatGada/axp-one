// Jev evaluates the ad path. The publisher's answer follows its own provider path.
import type { CSSProperties } from "react";
import { Arrow } from "@axp/design-system/prospectus";
import { JEV_URL } from "@/data/copy";
import s from "./jev.module.css";

const ext = { target: "_blank", rel: "noopener noreferrer" } as const;
const inputs = [
  { label: "Conversation", detail: "Question + task context", kind: "conversation" },
  { label: "Advertiser", detail: "Approved creative + authored hints", kind: "advertiser" },
  { label: "ContextHint", detail: "Embeddings → retrieved evidence", kind: "evidence" },
] as const;
const judgments = ["Relevance", "Buying intent", "Creative fit"] as const;

export default function Jev() {
  return (
    <section id="jev" data-world="brand" data-step="jev" className={s.jev} data-tone="brand" data-header-tone="brand" aria-labelledby="jev-title">
      <div className={`px-wrap ${s.grid}`}>
        <div className={s.left} data-tone-text="">
          <p className={s.label}>Decisions with Jev</p>
          <h2 id="jev-title" className={s.h2}>Jev judges the fit.</h2>
          <p className={s.note}>A relevant ad. An independent answer.</p>
          <a className={s.credit} href={JEV_URL} {...ext}>
            <span>Built with Jev by TypeSafe</span>
            <Arrow width={20} />
          </a>
        </div>
        <div className={s.sheet} data-reveal="sheet" data-visual="">
          <div className={s.answer}>
            <span className={s.answerK}>Example chat</span>
            <b>DeepSeek</b>
            <i aria-hidden="true" />
            <span className={s.answerResult}>Independent answer</span>
          </div>
          <div className={s.col}>
            <span className={s.k}>Ad context</span>
            {inputs.map((input, i) => (
              <div key={input.kind} className={s.input} data-kind={input.kind} style={{ "--i": i } as CSSProperties}>
                <span className={s.inputGlyph} aria-hidden="true"><i /><i /><i /></span>
                <div>
                  <b>{input.label}</b>
                  <span>{input.detail}</span>
                </div>
              </div>
            ))}
          </div>
          <div className={s.flow} aria-hidden="true">
            <i style={{ "--i": 0 } as CSSProperties} />
            <i style={{ "--i": 1 } as CSSProperties} />
            <i style={{ "--i": 2 } as CSSProperties} />
            <span className={s.engine}>Jev</span>
          </div>
          <div className={`${s.col} ${s.judgments}`}>
            <span className={s.k}>Fit judgments</span>
            {judgments.map((judgment, i) => (
              <div key={judgment} className={s.out} style={{ "--i": i } as CSSProperties}>
                <span className={s.outGlyph} aria-hidden="true"><i /><i /><i /></span>
                <span>{judgment}</span>
              </div>
            ))}
          </div>
          <div className={s.code}>
            <div className={s.policy}>
              <span className={s.k}>Deterministic auction</span>
              <p>Rules set the bid.</p>
            </div>
            <div className={s.limits}>
              <span>Eligibility</span>
              <span>Budgets</span>
              <span>Caps</span>
            </div>
            <span className={s.winner}>Highest valid bid wins</span>
          </div>
        </div>
      </div>
    </section>
  );
}
