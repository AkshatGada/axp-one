# Final demo narration

This is AXP. It connects advertisers with independent AI apps, so a useful Sponsored suggestion can appear beside an answer, without changing the answer itself. For the Arc Studio Continuity Track, we brought our existing product to Arc. The new feature lets those apps earn small USDC payments for accepted ad deliveries.

Let's start with the advertiser. Here, StackPilot has an approved campaign, a fixed spending limit, and the exact text that can appear in a Sponsored card. The advertiser can review the offer, choose when it is relevant, and keep spending within a clear cap. This campaign is funded with test USDC on Arc Testnet.

Now we switch to the app. Someone asks for help choosing developer tools. The app gives its own answer first. A separate Sponsored card appears underneath, with a clear label and a link to the advertiser. For this demonstration, the answer and buying judgment are prepared fixtures, as the page shows. The ad delivery and the payment flow are real.

Opening this turn shows what happened. The app has acknowledged that the card was inserted and that Sponsored disclosure was present. That accepted delivery creates one charge. Simply reserving a bid does not spend the budget, and sending the same receipt again does not create another charge. The advertiser's spend and the app's earnings come from the same delivery record.

Here is the Arc payment view. Each accepted delivery authorizes an exact payment to the app. Circle Gateway accepts these small payments without requiring a separate onchain transaction for every ad. The product shows acceptance and completed batch settlement separately, so an accepted payment is never presented as already finalized. The unused part of the advertiser's allocation remains in its Gateway balance.

We used Arc Studio to build the new payment integration and its reference experience, then brought that work into the existing AXP application. This is the actual Studio project and preview. The campaign, chat, and delivery flow remain part of AXP; Arc provides the new stablecoin payment rail. The existing Solana and Tempo options are still available.

The flow is straightforward. An advertiser approves a campaign. An independent app delivers a clearly disclosed Sponsored card. An accepted delivery earns a small USDC payment. Arc then provides a shared settlement record. That connects the advertising experience to something the app can actually earn, while keeping the answer independent and the spending limit visible.

And here is the recorded result. Two deliveries, at zero point zero zero two test USDC each, completed in the same Arc batch: zero point zero zero four in total. The Explorer transaction is real. This demo uses test assets; wallet withdrawal is outside this version. What we added during Mumbai is a working Arc payment path inside an existing product, from an accepted Sponsored delivery to the app's payment record.
