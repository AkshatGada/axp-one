// v7 footer: the giant lowercase wordmark, the scope lines, ContextHint and the credits.
import { SiteFooter } from "@axp/design-system/prospectus";
import { CH_URL, FOOTER, JEV_URL, SOLANA_URL } from "@/data/copy";
import s from "./footer.module.css";

const ext = { target: "_blank", rel: "noopener noreferrer" } as const;

export default function Footer() {
  return (
    <div className={s.wrap}>
    <SiteFooter
      scope={FOOTER.scope}
      legend={false}
      aside={
        <div className={s.aside}>
          <a href={CH_URL} {...ext}>
            {FOOTER.contexthint}
          </a>
          <p>
            {FOOTER.jev.text}{" "}
            <a href={JEV_URL} {...ext}>
              {FOOTER.jev.name}
            </a>
            .{" "}
            <a href={SOLANA_URL} {...ext}>
              {FOOTER.solana}
            </a>
            .
          </p>
        </div>
      }
      base={<span>{FOOTER.base}</span>}
    />
    </div>
  );
}
