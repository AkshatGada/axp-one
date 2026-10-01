// A specimen of the publisher's chat UI (a third-party surface, so it keeps the host's radius):
// the real question as typed, the actual organic answer (first two sentences) and the separate,
// disclosed Sponsored card that was sold at auction.
import type { CSSProperties, ReactNode } from "react";
import { Provenance } from "@axp/design-system/foundation";
import { SponsoredCard } from "./SponsoredCard";

export function HostChat({
  question,
  answer,
  appName,
  answerLabel = "Answer",
  card,
  intro,
  awaiting,
  marks = false,
  className,
  style,
}: {
  question: string;
  answer: string;
  /** Kept for the MVP; never shown on the landing. */
  model?: string;
  appName: string;
  answerLabel?: string;
  card?: { name: string; text: string; destination?: string | null };
  /** Play the load intro (CSS only, starts at first paint). */
  intro?: boolean;
  /** Show the slot as an awaiting outline instead of a card. */
  awaiting?: ReactNode;
  marks?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const words = answer.split(" ");
  return (
    <div className={className} style={style}>
      <div className="sp-chat" data-intro={intro ? "" : undefined}>
        <div className="sp-chat-bar">
          <span className="sp-chat-app">{appName}</span>
          <span className="sp-chat-slot">Answer, then one Sponsored slot</span>
        </div>
        <div className="sp-chat-body">
          <p className="sp-chat-q">{question}</p>
          <div className="sp-chat-a">
            <span className="sp-chat-who">{answerLabel}</span>
            <p className="sp-chat-text">
              {words.map((w, i) => (
                <span key={i}>
                  <span className="sp-tw" style={{ "--i": i } as CSSProperties}>
                    {w}
                  </span>{" "}
                </span>
              ))}
            </p>
          </div>
          <span className="sp-chat-gap">Separate from the answer</span>
          {card ? <SponsoredCard name={card.name} text={card.text} destination={card.destination} /> : <div className="sp-chat-wait">{awaiting ?? "Awaiting the auction"}</div>}
        </div>
      </div>
      {marks ? (
        <div className="px-marks" style={{ marginTop: 16 }}>
          <Provenance kind="actual" label="From our recorded run" />
        </div>
      ) : null}
    </div>
  );
}
