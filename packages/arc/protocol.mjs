// Adapted from Arc Studio's sdk/axp-arc-x402/requirements.ts in project
// 0c07e997-5564-4b38-94f9-099ea3e95393. Reviewed for AXP's stricter testnet,
// exact accepted-receipt authority, private signatures and frozen payment bounds.
import {ARC_NETWORK as N, arcCheck as check, sameAddress as same} from './network.mjs';
import {baseUnits, canonical} from '../contracts/index.mjs';
export const MIN_AUTH_VALIDITY_SECONDS = 7 * 24 * 60 * 60;
// One extra day permits delayed operator-selected submission of saved signatures.
export const AUTH_VALIDITY_SECONDS = MIN_AUTH_VALIDITY_SECONDS + 24 * 60 * 60;
export function buildDeliveryRequirements({payTo, amountBaseUnits}) {
  check(/^0x[0-9a-f]{40}$/i.test(payTo) && !/^0x0{40}$/i.test(payTo), 'arc_payee_invalid');
  check(baseUnits(amountBaseUnits) > 0n, 'arc_amount_invalid');
  return {scheme: 'exact', network: N.caip2, asset: N.token, amount: amountBaseUnits,
    payTo, maxTimeoutSeconds: AUTH_VALIDITY_SECONDS,
    extra: {name: 'GatewayWalletBatched', version: '1', verifyingContract: N.gatewayWallet}};
}
export function buildPaymentRequired(resourceUrl, requirements) {
  return {x402Version: 2, resource: {url: resourceUrl, description: 'AXP accepted Sponsored insertion receipt', mimeType: 'application/json'}, accepts: [requirements]};
}
export const encodeHeader = value => Buffer.from(JSON.stringify(value), 'utf8').toString('base64');
export function validateAuthorizationBinding({payload, requirements, resourceUrl, payer, nowSeconds = Math.floor(Date.now() / 1000)}) {
  check(payload?.x402Version === 2 && canonical(payload.accepted) === canonical(requirements), 'arc_requirements_mismatch');
  check(payload.resource?.url === resourceUrl, 'arc_resource_mismatch');
  const auth = payload.payload?.authorization;
  check(auth && same(auth.from, payer) && same(auth.to, requirements.payTo) && auth.value === requirements.amount, 'arc_payment_binding');
  check(/^0x[0-9a-f]{64}$/i.test(auth.nonce ?? '') && /^0x[0-9a-f]{130}$/i.test(payload.payload.signature ?? ''), 'arc_authorization_invalid');
  check(/^[0-9]+$/.test(auth.validAfter) && /^[0-9]+$/.test(auth.validBefore), 'arc_validity_invalid');
  check(BigInt(auth.validAfter) <= BigInt(nowSeconds) && BigInt(auth.validBefore) - BigInt(nowSeconds) >= BigInt(MIN_AUTH_VALIDITY_SECONDS), 'arc_validity_invalid');
  return auth;
}
export const transferStage = status => ({received: 'accepted', batched: 'batched', confirmed: 'confirmed', completed: 'finalized', failed: 'failed'})[status];
