// Real ads observed inside ChatGPT (ContextHint's library), exactly as captured: title,
// description, creative and logo. Images are copied locally into /public/observed-ads (no
// hot-linking). These brands are observed references, never axp.one advertisers.
export type ObservedAd = { slug: string; brand: string; title: string; body: string };

export const OBSERVED_ADS: ObservedAd[] = [
  { slug: "canva", brand: "Canva", title: "AI video creator", body: "Brief to video. Free." },
  { slug: "monday", brand: "monday.com", title: "One CRM for your entire sales cycle", body: "From lead capture to close, track everything in a single workspace" },
  { slug: "quickbooks", brand: "QuickBooks", title: "Free Bookkeeping Tools", body: "Track income and expenses and stay organized." },
  { slug: "robinhood", brand: "Robinhood", title: "Put Your Cash to Work", body: "Intuitive trading tools to build your strategy." },
  { slug: "cloudflare", brand: "Cloudflare", title: "The full-stack for building Agents", body: "Everything you need to build, deploy, and scale AI Agents" },
  { slug: "asana", brand: "Asana", title: "Work works better in Asana", body: "Trusted by top teams to manage complex work. Try Asana." },
  { slug: "salesforce", brand: "Salesforce", title: "Orchestrate AI Agent Workflows", body: "Make any API agent-ready with MuleSoft Agent Fabric." },
  { slug: "miro", brand: "Miro", title: "Create Flowcharts with AI on Miro", body: "Create and share diagrams together in real time." },
  { slug: "rocketmortgage", brand: "Rocket Mortgage", title: "First home made easy.", body: "Expert guidance for first-time home buyers." },
  { slug: "fidelity", brand: "Fidelity", title: "Advanced Trading Platform", body: "Trading Platforms with Tools and Market Research." },
  { slug: "okta", brand: "Okta", title: "Governance made simple", body: "Manage compliance access reviews and policies easily. Start your free trial." },
  { slug: "datadog", brand: "Datadog", title: "Break Down Your Data Silos", body: "1 platform for all your frontend & backend data." },
  { slug: "angi", brand: "Angi", title: "Kitchen Remodel Pros", body: "Get quotes in minutes from affordable kitchen remodel pros." },
  { slug: "legalzoom", brand: "LegalZoom", title: "Turn Your Idea Into a Business", body: "LegalZoom helps you register and set up the business structure that fits." },
  { slug: "cursor", brand: "Cursor", title: "AI Code Editor", body: "The next generation AI IDE for developers." },
  { slug: "mastercard", brand: "Mastercard", title: "AI Identity Verification", body: "Build trust in digital interactions with Mastercard." },
  { slug: "crowdstrike", brand: "CrowdStrike", title: "Track AI Activity", body: "Monitor prompts, models, users, and agents." },
];
