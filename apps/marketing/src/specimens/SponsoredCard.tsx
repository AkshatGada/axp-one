// The disclosed card exactly as approved: label first, then the advertiser's approved text.
// Destinations are .example addresses, shown as text and never linked.
export function SponsoredCard({ name, text, destination, square }: { name: string; text: string; destination?: string | null; square?: boolean }) {
  const host = destination ? destination.replace(/^https?:\/\//, "").replace(/\/$/, "") : null;
  return (
    <div className="sp-card" data-square={square ? "" : undefined}>
      <div className="sp-card-head">
        <span className="sp-card-label">Sponsored</span>
        <span className="sp-card-name">{name}</span>
      </div>
      <p className="sp-card-text">{text}</p>
      <div className="sp-card-foot">
        {host ? <span>{host}</span> : null}
      </div>
    </div>
  );
}
