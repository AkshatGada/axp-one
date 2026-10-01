import Link from "next/link";
import { PageHead, Provenance } from "@axp/design-system/ledger";

export default function Overview() {
  return (
    <PageHead kicker={<Provenance kind="replay" />} title="One recorded run of an ad exchange inside an AI app.">
      <div className="lg-row">
        <Link className="lg-btn m-gun m-chrome-rim" href="/opportunity/1/">
          Step through opportunity 1 <span className="lg-arrow">→</span>
        </Link>
      </div>
    </PageHead>
  );
}
