// Canonical JSON and SHA-256, ported from packages/contracts/index.mjs (canonical, hash).
// Runs unchanged in Node (build, tests) and in the browser (/verify) via WebCrypto.

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") {
    if (typeof value === "number" && !Number.isFinite(value)) throw new Error("nonfinite");
    if (value === undefined || typeof value === "bigint") throw new Error("invalid_json");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`)
    .join(",")}}`;
}

function subtle(): SubtleCrypto {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (!c || !c.subtle) throw new Error("webcrypto_unavailable");
  return c.subtle;
}

export function toHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, "0");
  return out;
}

export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  return toHex(await subtle().digest("SHA-256", data));
}

/** sha256(canonical(value)): the contracts package `hash`. */
export async function hashCanonical(value: unknown): Promise<string> {
  return sha256Hex(canonical(value));
}

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64.replace(/\s+/g, ""));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function pemToDer(pem: string): Uint8Array {
  return base64ToBytes(pem.replace(/-----[^-]+-----/g, ""));
}

export type Ed25519Result = { ok: boolean; supported: boolean; error?: string };

// A fixed, known-good Ed25519 test vector (generated for this purpose; unrelated to the run). It tells a browser
// that cannot do Ed25519 apart from a publisher key that is unreadable, which must count as a failure.
const PROBE = {
  pem: "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAuZvnB6IA/v+wOOMBmhl+ZRWwrKroKU+EKhP0nxFe1rk=\n-----END PUBLIC KEY-----\n",
  msg: "axp.one ed25519 support probe",
  sig: "26FguLL/p0VmV0J/KkA8CEP2do9EShLPvcT9ik3c7a2ovzk+TOH13DdJDT6GeFXoW/SfJfDmEicL7b7QidzWDg==",
};
let probeResult: Promise<boolean> | null = null;
/** True when this browser (or Node) can import an Ed25519 SPKI key and verify a known-good signature. */
export function ed25519Supported(): Promise<boolean> {
  if (!probeResult)
    probeResult = (async () => {
      try {
        const key = await subtle().importKey("spki", pemToDer(PROBE.pem) as BufferSource, { name: "Ed25519" }, false, ["verify"]);
        return await subtle().verify({ name: "Ed25519" }, key, base64ToBytes(PROBE.sig) as BufferSource, new TextEncoder().encode(PROBE.msg) as BufferSource);
      } catch {
        return false;
      }
    })();
  return probeResult;
}

/** Verify an Ed25519 signature over UTF-8 text with an SPKI PEM public key.
 *  supported:false only when the environment itself cannot do Ed25519; an unreadable key is a failure. */
export async function verifyEd25519(publicKeyPEM: string, signatureB64: string, message: string): Promise<Ed25519Result> {
  const supported = await ed25519Supported();
  if (!supported) return { ok: false, supported: false, error: "Ed25519 unavailable in this environment" };
  let key: CryptoKey;
  try {
    key = await subtle().importKey("spki", pemToDer(publicKeyPEM) as BufferSource, { name: "Ed25519" }, false, ["verify"]);
  } catch (e) {
    return { ok: false, supported: true, error: `publisher key unreadable: ${e instanceof Error ? e.message : String(e)}` };
  }
  try {
    const ok = await subtle().verify({ name: "Ed25519" }, key, base64ToBytes(signatureB64) as BufferSource, new TextEncoder().encode(message) as BufferSource);
    return { ok, supported: true, ...(ok ? {} : { error: "signature does not match" }) };
  } catch (e) {
    return { ok: false, supported: true, error: e instanceof Error ? e.message : String(e) };
  }
}
