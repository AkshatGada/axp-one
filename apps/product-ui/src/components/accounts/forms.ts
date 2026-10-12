/** Input helpers shared with the fixture tests; the server remains authoritative. */
export function lines(value: string): string[] {
  return [...new Set(value.split(/\r?\n/).map(line => line.trim()).filter(Boolean))];
}
function developmentHost(host: string) {
  return ['localhost', '127.0.0.1', '[::1]'].includes(host);
}
export function validateWebsite(value: string): string {
  const text = value.trim();
  let url: URL;
  try { url = new URL(text); } catch { throw new Error('Enter an absolute HTTPS website URL.'); }
  if (text.length > 2048 || /[\s\\*]/u.test(text) ||
      (url.protocol !== 'https:' && !(url.protocol === 'http:' && developmentHost(url.hostname))) ||
      url.username || url.password) throw new Error('Use HTTPS, or HTTP on a loopback development host, without URL credentials, whitespace or wildcards.');
  return text;
}
export function origins(value: string): string[] {
  const entries = lines(value);
  if (entries.length > 32) throw new Error('Save at most 32 allowed origins.');
  return entries.map(text => {
    validateWebsite(text);
    const url = new URL(text);
    if (!/^https?:\/\/[^/?#]+\/?$/u.test(text) || url.pathname !== '/' || url.search || url.hash) {
      throw new Error('Allowed origins must contain only a scheme, host and optional port; no paths, query strings or wildcards.');
    }
    return url.origin;
  }).filter((value, index, values) => values.indexOf(value) === index);
}
export function categories(value: string): string[] {
  const entries = lines(value);
  if (entries.length > 32 || entries.some(entry => entry.length > 80 || /[\u0000-\u001f\u007f]/u.test(entry))) {
    throw new Error('Save at most 32 categories, each up to 80 characters without control characters.');
  }
  return entries;
}
export interface ConfirmationLink { tokenHash: string | null; invalid: boolean }
/** Scrub before any fetch. Reading a link never confirms it or sends a POST. */
export function consumeConfirmationLink(href: string, replace: (cleanUrl: string) => void): ConfirmationLink {
  const url = new URL(href);
  const hasLink = url.searchParams.has('token_hash');
  const fragment = new URLSearchParams(url.hash.slice(1));
  const hasCredentials = hasLink || ['access_token', 'refresh_token', 'token', 'code', 'error', 'type']
    .some(key => url.searchParams.has(key) || fragment.has(key)) || fragment.has('token_hash');
  const tokenHash = url.searchParams.get('token_hash');
  const valid = hasLink && url.searchParams.getAll('token_hash').length === 1 &&
    url.searchParams.getAll('type').length === 1 && url.searchParams.get('type') === 'email' &&
    typeof tokenHash === 'string' && /^[a-f0-9]{56}$/i.test(tokenHash);
  if (hasCredentials) replace(url.pathname);
  return { tokenHash: valid ? tokenHash : null, invalid: hasCredentials && !valid };
}
