// Server-only official Circle SDK transport. No high-level SDK method may hide a
// funding broadcast: the caller persists exact native bytes before submitNative.
import {canonical} from '../contracts/index.mjs';
import {loadArcSDK} from './sdk.mjs';
import {buildDeliveryRequirements,buildPaymentRequired,validateAuthorizationBinding,transferStage} from './protocol.mjs';
import {readArcWallet} from './wallet.mjs';
import {ARC_NETWORK as N, ARC_LIMITS, arcCheck as check, arcRPCURL, sameAddress as same} from './network.mjs';
const API = 'https://gateway-api-testnet.circle.com';
const HEX = /^0x[0-9a-f]{64}$/i;
const json = value => JSON.parse(JSON.stringify(value, (_, v) => typeof v === 'bigint' ? v.toString() : v));
export {buildDeliveryRequirements as paymentRequirements} from './protocol.mjs';
export async function validateArcNativeTransaction(signed, payer, limits = ARC_LIMITS) {
  const {viem: v} = loadArcSDK();
  check(['approve','deposit'].includes(signed.kind), 'arc_native_kind_invalid');
  const amount = BigInt(signed.amountBaseUnits);
  check(amount > 0n && amount <= BigInt(limits.maxDepositBaseUnits), 'arc_deposit_cap');
  const abi = signed.kind === 'approve' ? v.erc20Abi : v.parseAbi(['function deposit(address token,uint256 value)']);
  const expectedTo = signed.kind === 'approve' ? N.token : N.gatewayWallet;
  const expectedData = v.encodeFunctionData({abi, functionName: signed.kind === 'approve' ? 'approve' : 'deposit', args: signed.kind === 'approve' ? [N.gatewayWallet,amount] : [N.token,amount]});
  check(v.keccak256(signed.wire) === signed.transactionHash && same(await v.recoverTransactionAddress({serializedTransaction:signed.wire}), payer), 'arc_native_identity_mismatch');
  const parsed = v.parseTransaction(signed.wire);
  check(parsed.type === 'eip1559' && parsed.chainId === N.chainId && same(parsed.to, expectedTo) && parsed.data === expectedData && parsed.nonce === signed.nonce && (parsed.value ?? 0n) === 0n, 'arc_native_identity_mismatch');
  check(parsed.gas * parsed.maxFeePerGas === BigInt(signed.feeReservationAttoUSD) && BigInt(signed.feeReservationAttoUSD) <= BigInt(limits.maxTransactionFeeAttoUSD), 'arc_fee_cap');
  return parsed;
}
export function validateArcPaymentIntegrity(payment, payer, payee) {
  const {viem:v} = loadArcSDK();
    const {requirements: r, payload} = payment, a = payload?.payload?.authorization;
    check(r.network === N.caip2 && same(r.asset, N.token) && same(r.payTo, payee) && same(r.extra?.verifyingContract, N.gatewayWallet) && r.extra?.name === 'GatewayWalletBatched' && r.extra.version === '1', 'arc_payment_binding');
    check(a && same(a.from, payer) && same(a.to, payee) && a.value === r.amount && a.nonce === payment.nonce && payload.x402Version === 2, 'arc_payment_binding');
    const orderedLegacy = {x402Version:payload.x402Version,payload:{authorization:{from:a.from,to:a.to,value:a.value,validAfter:a.validAfter,validBefore:a.validBefore,nonce:a.nonce},signature:payload.payload.signature},accepted:{scheme:r.scheme,network:r.network,asset:r.asset,amount:r.amount,payTo:r.payTo,maxTimeoutSeconds:r.maxTimeoutSeconds,extra:{name:r.extra.name,version:r.extra.version,verifyingContract:r.extra.verifyingContract}},resource:{url:payload.resource.url,description:payload.resource.description,mimeType:payload.resource.mimeType}};
    const encoded = payment.payloadHashEncoding === 'canonical-json-v1' ? canonical(payload) : JSON.stringify(orderedLegacy);
    check(canonical(payload) === canonical(orderedLegacy) && v.keccak256(v.toHex(encoded)) === payment.payloadHash, 'arc_payment_changed');
  }

export function createArcTransport({walletPath, rpcURL = N.rpc, limits = ARC_LIMITS} = {}) {
  const {viem: v, accounts, client: c, server: s} = loadArcSDK();
  const wallet = readArcWallet(walletPath), payer = accounts.privateKeyToAccount(wallet.payer.privateKey);
  const payee = wallet.publisher.address.toLowerCase();
  const chain = {...c.CHAIN_CONFIGS.arcTestnet.chain, id: N.chainId};
  const publicClient = v.createPublicClient({chain, transport: v.http(arcRPCURL(rpcURL), {retryCount: 0, timeout: 15000})});
  const gateway = new c.GatewayClient({chain: 'arcTestnet', privateKey: wallet.payer.privateKey, rpcUrl: arcRPCURL(rpcURL)});
  const facilitator = new s.BatchFacilitatorClient({url: API});
  const gatewayABI = v.parseAbi(['function deposit(address token,uint256 value)', 'function totalBalance(address token,address depositor) view returns (uint256)']);
  let observedCode;
  async function inspect() {
    check(await publicClient.getChainId() === N.chainId, 'arc_chain_mismatch');
    const config = c.CHAIN_CONFIGS.arcTestnet;
    check(config.domain === N.domain && same(config.tokens.USDC.address, N.token) && same(config.gatewayWallet, N.gatewayWallet), 'arc_sdk_configuration_mismatch');
    const [decimals, code, tokenCode, supported, balances] = await Promise.all([
      publicClient.readContract({address: N.token, abi: v.erc20Abi, functionName: 'decimals'}),
      publicClient.getCode({address: N.gatewayWallet}), publicClient.getCode({address: N.token}),
      facilitator.getSupported(), gateway.getBalances(),
    ]);
    check(decimals === 6 && code && code !== '0x' && tokenCode && tokenCode !== '0x', 'arc_contract_unavailable');
    const kind = supported.kinds.find(k => k.network === N.caip2 && k.x402Version === 2 && k.scheme === 'exact');
    check(kind?.extra?.name === 'GatewayWalletBatched' && kind.extra.version === '1' && same(kind.extra.verifyingContract, N.gatewayWallet), 'arc_facilitator_mismatch');
    const codeHash = v.keccak256(code);
    check(!observedCode || observedCode === codeHash, 'arc_gateway_code_changed'); observedCode = codeHash;
    return {chainId: N.chainId, token: N.token, decimals, gatewayWallet: N.gatewayWallet, codeHash,
      payer: payer.address.toLowerCase(), payee, walletBaseUnits: String(balances.wallet.balance),
      gatewayAvailableBaseUnits: String(balances.gateway.available), compatible: true};
  }
  async function signNative({kind, amountBaseUnits}) {
    await inspect();
    check(['approve', 'deposit'].includes(kind), 'arc_native_kind_invalid');
    const amount = BigInt(amountBaseUnits);
    check(amount > 0n && amount <= BigInt(limits.maxDepositBaseUnits), 'arc_deposit_cap');
    const to = kind === 'approve' ? N.token : N.gatewayWallet;
    const data = v.encodeFunctionData({abi: kind === 'approve' ? v.erc20Abi : gatewayABI,
      functionName: kind === 'approve' ? 'approve' : 'deposit',
      args: kind === 'approve' ? [N.gatewayWallet, amount] : [N.token, amount]});
    const fees = await publicClient.estimateFeesPerGas();
    const maxFeePerGas = fees.maxFeePerGas > 20000000000n ? fees.maxFeePerGas : 20000000000n;
    const gas = await publicClient.estimateGas({account: payer.address, to, data});
    const gasLimit = gas * 120n / 100n + 10000n;
    check(gasLimit * maxFeePerGas <= BigInt(limits.maxTransactionFeeAttoUSD), 'arc_fee_cap');
    const nonce = await publicClient.getTransactionCount({address: payer.address, blockTag: 'pending'});
    const request = {chainId: N.chainId, type: 'eip1559', to, data, value: 0n, nonce, gas: gasLimit,
      maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas ?? 1000000000n};
    const wire = await payer.signTransaction(request), transactionHash = v.keccak256(wire);
    return {kind, amountBaseUnits, wire, transactionHash, nonce, to, data, feeReservationAttoUSD: String(gasLimit * maxFeePerGas)};
  }
  async function lookupNative(signed) {
    check(await publicClient.getChainId() === N.chainId, 'arc_chain_mismatch');
    await validateArcNativeTransaction(signed, payer.address, limits);
    let receipt;
    try { receipt = await publicClient.getTransactionReceipt({hash: signed.transactionHash}); }
    catch (e) { if (e.name === 'TransactionReceiptNotFoundError') return {status: 'pending', transactionHash: signed.transactionHash}; throw e; }
    check(receipt.transactionHash === signed.transactionHash && same(receipt.from, payer.address) && same(receipt.to, signed.to), 'arc_native_receipt_mismatch');
    const block = await publicClient.getBlock({blockNumber: receipt.blockNumber});
    check(block.hash === receipt.blockHash, 'arc_native_block_mismatch');
    const feeAttoUSD = receipt.gasUsed * receipt.effectiveGasPrice;
    check(feeAttoUSD <= BigInt(signed.feeReservationAttoUSD), 'arc_fee_cap');
    return {status: receipt.status === 'success' ? 'finalized' : 'failed', finality: 'finalized',
      transactionHash: signed.transactionHash, network: N.network, chainId: N.chainId,
      blockNumber: String(receipt.blockNumber), blockHash: receipt.blockHash, feeAttoUSD: String(feeAttoUSD),
      feeAmountBaseUnits: String((feeAttoUSD + 999999999999n) / 1000000000000n), feeAsset: 'native test USDC',
      gasUsed: String(receipt.gasUsed), effectiveGasPrice: String(receipt.effectiveGasPrice)};
  }
  async function submitNative(signed) {
    check(await publicClient.getChainId() === N.chainId, 'arc_chain_mismatch');
    await validateArcNativeTransaction(signed, payer.address, limits);
    const hash = await publicClient.sendRawTransaction({serializedTransaction: signed.wire});
    check(hash === signed.transactionHash, 'arc_native_identity_mismatch');
    try { await publicClient.waitForTransactionReceipt({hash, timeout: 15000, pollingInterval: 1000}); } catch { /* lookup the same identity */ }
    return lookupNative(signed);
  }
  async function signPayment({amountBaseUnits, receiptHash}) {
    await inspect();
    const requirements = buildDeliveryRequirements({amountBaseUnits, payTo: payee});
    const resourceUrl = `https://axp.one/api/product/arc/receipts/${receiptHash}`;
    const challenge = buildPaymentRequired(resourceUrl, requirements);
    let typedData;
    const scheme = new c.BatchEvmScheme({address: payer.address, signTypedData: async data => {
      typedData = data;
      return payer.signTypedData(data);
    }});
    const partial = await scheme.createPaymentPayload(2, requirements);
    const payload = {...partial, accepted: requirements,
      resource: challenge.resource};
    const a = validateAuthorizationBinding({payload,requirements,resourceUrl,payer:payer.address});
    check(same(a.from, payer.address) && same(a.to, payee) && a.value === amountBaseUnits && HEX.test(a.nonce), 'arc_payment_binding');
    check(await v.verifyTypedData({...typedData, address: payer.address, signature: payload.payload.signature}), 'arc_payment_signature_invalid');
    return {requirements, payload: json(payload), nonce: a.nonce,
      payloadHash: v.keccak256(v.toHex(canonical(json(payload)))), payloadHashEncoding: 'canonical-json-v1', signedAt: Date.now()};
  }
  async function verifyPayment(payment) { validateArcPaymentIntegrity(payment, payer.address, payee); validateAuthorizationBinding({payload:payment.payload,requirements:payment.requirements,resourceUrl:payment.payload.resource.url,payer:payer.address}); return facilitator.verify(payment.payload, payment.requirements); }
  async function settlePayment(payment) { validateArcPaymentIntegrity(payment, payer.address, payee); validateAuthorizationBinding({payload:payment.payload,requirements:payment.requirements,resourceUrl:payment.payload.resource.url,payer:payer.address}); return facilitator.settle(payment.payload, payment.requirements); }
  async function lookupPayment(payment) {
    validateArcPaymentIntegrity(payment, payer.address, payee);
    // Search by the ORIGINAL nonce. Empty results never authorize a fresh send.
    let pageAfter, found = [], seen = new Set();
    do {
      const page = await gateway.searchTransfers({from: payer.address, to: payee, nonce: payment.nonce, network: N.caip2, token: 'USDC', pageSize: 100, ...(pageAfter ? {pageAfter} : {})});
      found.push(...page.transfers); pageAfter = page.pagination?.pageAfter;
      check(!pageAfter || !seen.has(pageAfter), 'arc_pagination_loop'); if (pageAfter) seen.add(pageAfter);
    } while (pageAfter);
    check(found.length <= 1, 'arc_transfer_duplicate');
    if (!found.length) return {status: 'unknown', reasonCode: 'arc_transfer_not_observed'};
    const t = found[0];
    check(same(t.fromAddress, payer.address) && same(t.toAddress, payee) && t.nonce === payment.nonce && t.sendingNetwork === N.caip2 && t.recipientNetwork === N.caip2 && t.token === 'USDC' && t.amount === payment.requirements.amount, 'arc_transfer_binding');
    let batchProof = null;
    if (transferStage(t.status) === 'finalized' && HEX.test(t.txHash ?? '')) {
      const receipt = await publicClient.getTransactionReceipt({hash: t.txHash});
      check(receipt.status === 'success' && same(receipt.to, N.gatewayWallet), 'arc_batch_receipt_invalid');
      const block = await publicClient.getBlock({blockNumber: receipt.blockNumber});
      check(block.hash === receipt.blockHash, 'arc_batch_block_mismatch');
      batchProof = {transactionHash: t.txHash, blockNumber: String(receipt.blockNumber), blockHash: receipt.blockHash,
        status: 'finalized', finality: 'finalized', network: N.network, chainId: N.chainId,
        attribution: 'Gateway transfer API links this nonce to the RPC-verified batch transaction'};
    }
    return {status: batchProof ? 'finalized' : t.status === 'failed' ? 'failed' : 'accepted',
      transferId: t.id, transferStatus: t.status, batchProof};
  }
  return {inspect, signNative, submitNative, lookupNative, signPayment, verifyPayment, settlePayment, lookupPayment,
    balances: async () => {const b = await gateway.getBalances(); return {walletBaseUnits: String(b.wallet.balance), gatewayAvailableBaseUnits: String(b.gateway.available)};},
    identities: {payer: payer.address.toLowerCase(), payee}};
}
