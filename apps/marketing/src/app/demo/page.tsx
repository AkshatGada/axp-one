import type { Metadata } from 'next';
import { ActionPrimary, ActionText, VideoFigure, Wordmark } from '@axp/design-system/prospectus';
import recording from '@/data/product-recording.json';
import s from './demo.module.css';

export const metadata: Metadata = {title: 'The product walkthrough · axp.one', description: 'From advertiser setup to an independent AI answer, sponsored delivery and Solana payment-channel settlement.'};

export default function Demo() {
  return <>
    <header className={s.header}><a className={s.wordmark} href="/" aria-label="axp.one home"><Wordmark /></a><span>Product walkthrough</span><ActionText href="/">Back to the exchange</ActionText></header>
    <main id="main" className={s.main}>
      <div className={s.intro}><p className={s.label}>Live product. Recorded on Solana Devnet.</p><h1>One moment.<br /><span>The whole exchange.</span></h1><p className={s.lead}>Create a campaign. Ask a question. Follow its payment.</p></div>
      <VideoFigure src="/video/product-walkthrough.mp4" poster="/video/product-walkthrough.webp" track="/video/product-walkthrough.vtt" chapters={recording.chapters} title="AXP advertiser and publisher walkthrough" caption="Edited for pace. DeepSeek powers the example chat. Jev decides ad fit. Payments use Devnet test USDC." />
      <div className={s.next}><div><p className={s.label}>Try it yourself</p><h2>Take either side.</h2></div><div className={s.actions}><ActionPrimary href="/advertiser-dashboard/">Create a campaign</ActionPrimary><ActionPrimary href="/publisher-demo/" variant="outline">Open the chat</ActionPrimary></div></div>
      <footer className={s.footer}><ActionText href="/mvp/">Explore the original MVP</ActionText><a href="/video/product-walkthrough.mp4" download>Download the video</a></footer>
    </main>
  </>;
}
