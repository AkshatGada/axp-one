# Revised demo narration

Version 2 gives AXP a longer introduction before the Arc walkthrough. Calm male
narration, with short chapter pauses; approximately 3 minutes 18 seconds in total.

AXP is an advertising network for independent AI apps and agents. Think of a developer building a chat assistant or a specialist research tool. They want to earn revenue from the app. Advertisers, meanwhile, want to reach people when their product is relevant to what someone is doing.

AXP connects those two sides. An advertiser supplies an approved offer and a spending limit. The app can show that offer as a clearly labelled Sponsored card, separate from its own answer. When the app confirms the card was delivered, it earns a small payment. That's the existing product. For Mumbai, we added Arc Nanopayments, so those accepted deliveries can be paid in USDC.

Here's the advertiser's side. StackPilot has an approved campaign, the exact Sponsored text, and a fixed spending cap. This allocation uses test USDC on Arc Testnet. The advertiser can see what is eligible to appear, and how much of the allocation has been used.

Now we move to the independent app. Someone asks for help choosing developer tools. The app gives its own answer, and a separate Sponsored card appears underneath. In this demo, the answer and buying judgment are prepared fixtures, as the page shows. The delivery receipt, accounting, and Arc payment path are real.

Opening the delivery shows the next step. The app has acknowledged that the card was inserted with Sponsored disclosure. That accepted receipt creates one charge. Reserving a bid doesn't charge the advertiser, and submitting the same receipt again doesn't create another payment. Here, one delivery earns zero point zero zero two test USDC.

The payment view separates authorization, Gateway acceptance, and completed settlement. We use Circle Gateway Nanopayments to accept small payments without sending a separate onchain transaction for every ad. Gateway later settles them in a shared Arc batch. Acceptance isn't treated as finality, and the unused allocation remains in the advertiser's Gateway balance.

This is the actual Arc Studio project. We used Studio to develop and review the Arc integration and its reference experience, then brought that work into the existing AXP app. The diagram shows the connection: campaign, independent app, accepted delivery, then an exact USDC payment through Gateway to Arc settlement. The existing Solana and Tempo options remain available.

Finally, here's the recorded settlement proof. Two earlier deliveries, each worth zero point zero zero two test USDC, completed in the same Arc batch. That's zero point zero zero four in total. The Explorer shows the successful transaction. These are test assets, and wallet withdrawal is outside this version. AXP already connected advertisers and AI apps. What we added is a working Arc payment path from an accepted Sponsored delivery to the app's earnings.
