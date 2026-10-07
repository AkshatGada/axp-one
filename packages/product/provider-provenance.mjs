// Server-owned identity, never an input field or property supplied by a browser.
const actual = new WeakSet();
export function officialProvider(transport, usesNativeFetch) {
  if (usesNativeFetch) actual.add(transport);
  return transport;
}
export function providerExecution(transport) {
  return actual.has(transport) ? 'actual-api-model' : 'fixture';
}
export function inheritProviderExecution(wrapper, source) {
  if (actual.has(source)) actual.add(wrapper);
  return wrapper;
}
