// Direct product entry points after the exchange story.
import { ActionPrimary, ActionText } from "@axp/design-system/prospectus";
import { ADVERTISER_URL, CLOSING, PRODUCT_VIDEO_URL, PUBLISHER_URL } from "@/data/copy";
import s from "./closing.module.css";

export default function Closing() {
  return (
    <section data-world="brand" className={s.close} data-tone="brand" data-header-tone="brand" aria-labelledby="close-title">
      <div className={`px-wrap ${s.in}`} data-tone-text="">
        <h2 id="close-title" className={s.h2}>{CLOSING.h2}</h2>
        <div className={s.actions}>
          <ActionPrimary href={ADVERTISER_URL}>{CLOSING.primary}</ActionPrimary>
          <ActionText href={PUBLISHER_URL}>{CLOSING.chat}</ActionText>
          <ActionText href={PRODUCT_VIDEO_URL}>{CLOSING.video}</ActionText>
        </div>
      </div>
    </section>
  );
}
