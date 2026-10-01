#!/usr/bin/env node
// Copy and claims lint for the landing page. Fails on:
//   1. em or en dashes anywhere in the page source (src/**, design-system/prospectus/**), and in the
//      built page text when out/index.html exists;
//   2. forbidden claims in src/data/copy.ts (and in literal strings of scene/specimen files),
//      unless the line is a stated negation or limit marked `// claim-ok`.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const prospectus = resolve(app, "../../design-system/prospectus");
const DASH = /[–—]/;
const TERMS = [
  [/partner/i, "partnership"],
  [/\bfirst\b/i, "first (industry-first claims)"],
  [/\blift\b/i, "lift"],
  [/conversion/i, "conversion"],
  [/viewab/i, "viewability"],
  [/attention/i, "attention"],
  [/mainnet/i, "mainnet outside limits/next"],
  [/x402/i, "x402 outside Planned"],
  [/sub-?50/i, "sub-50ms"],
  [/chatgpt algorithm/i, "ChatGPT algorithm"],
  [/\benrol/i, "enrollment"],
  [/\bguarantee/i, "guarantee"],
  [/replicat/i, "replication"],
];
// Terms that are ordinary code words; only checked in copy.ts.
const COPY_ONLY = new Set(["first (industry-first claims)"]);

const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const files = [...walk(join(app, "src")), ...walk(prospectus)].filter((f) => /\.(tsx?|css|mjs)$/.test(f));

const hits = [];
for (const f of files) {
  const lines = readFileSync(f, "utf8").split("\n");
  const isCopy = f.endsWith("src/data/copy.ts");
  const isUi = /\/(scenes|specimens|app)\//.test(f) || f.startsWith(prospectus);
  lines.forEach((line, i) => {
    const where = `${relative(resolve(app, "../.."), f)}:${i + 1}`;
    if (DASH.test(line)) hits.push(`${where}  dash: ${line.trim().slice(0, 100)}`);
    if (line.includes("claim-ok")) return;
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return;
    if (!isCopy && !isUi) return;
    // In UI files only look inside string literals and JSX text.
    const text = isCopy ? line : (line.match(/"[^"]*"|`[^`]*`|>[^<>{}]+</g) ?? []).join(" ");
    for (const [re, name] of TERMS) {
      if (!isCopy && COPY_ONLY.has(name)) continue;
      if (re.test(text)) hits.push(`${where}  ${name}: ${trimmed.slice(0, 110)}`);
    }
  });
}

// The built pages: visible text must carry no dashes; the landing must carry no internal details
// (record IDs, hashes, policy names, model versions, level shorthands, run IDs): those live in the MVP.
const textOf = (f) =>
  readFileSync(f, "utf8")
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ");
const INTERNAL = [/ads:(mapping|hint):/, /fit_intent/, /jev-\d/i, /gpt-\d/i, /\bR\d I\d\b/, /\b[0-9a-f]{8}\.\.\.[0-9a-f]{4,}/, /v3-wallet-acceptance/, /missing_constraint/, /frequency_cap/, /crypto_storage/, /campaign ID/i, /base units/i, /lamport/i, /legacy/i];
const sourceOnly = process.argv.includes("--source-only");
const builtPages = sourceOnly ? [] : [join(app, "out/index.html"), join(app, "out/design/index.html")].filter(existsSync);
for (const page of builtPages) {
  const text = textOf(page);
  const name = relative(app, page);
  const m = text.match(/.{0,60}[\u2013\u2014].{0,60}/g);
  if (m) for (const x of m) hits.push(`${name}  dash in rendered text: ${x.trim()}`);
  if (name === "out/index.html") {
    for (const re of INTERNAL) {
      const k = text.match(new RegExp(`.{0,40}${re.source}.{0,40}`, re.flags));
      if (k) hits.push(`${name}  internal detail on the landing (${re}): ${k[0].trim()}`);
    }
  }
}
const built = builtPages[0] ?? join(app, "out/index.html");

if (hits.length) {
  console.error(`lint-copy: ${hits.length} problem(s)`);
  for (const h of hits) console.error(`  x ${h}`);
  process.exit(1);
}
console.log(`lint-copy: ${files.length} files clean${builtPages.length ? ` (and ${builtPages.map((p) => relative(app, p)).join(", ")})` : ""}.`);
