import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { DEVNET_CONFIG, validateDevnetConfig } from '../../packages/payments/network-policy.mjs';

const READ_METHODS = new Set(['getGenesisHash', 'getSlot', 'getAccountInfo', 'getTokenAccountsByOwner']);
const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function base58(bytes) {
  let number = 0n; for (const byte of bytes) number = number * 256n + BigInt(byte);
  let out = ''; while (number) { out = alphabet[Number(number % 58n)] + out; number /= 58n; }
  for (const byte of bytes) { if (byte !== 0) break; out = '1' + out; }
  return out;
}
function publicAddress(value) {
  if (typeof value !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) throw new Error('public_address_invalid');
  let number = 0n; for (const char of value) number = number * 58n + BigInt(alphabet.indexOf(char));
  let length = 0; while (number) { number /= 256n; length++; }
  for (const char of value) { if (char !== '1') break; length++; }
  if (length !== 32) throw new Error('public_address_invalid');
  return value;
}
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
export async function checkDevnet({ rpc = DEVNET_CONFIG.rpc, payer, payee, fetchImpl = fetch } = {}) {
  validateDevnetConfig({ ...DEVNET_CONFIG, rpc });
  if (payer) publicAddress(payer); if (payee) publicAddress(payee);
  if (payer && payee && payer === payee) throw new Error('payer_payee_must_differ');
  const report = { schemaVersion: 'axp.devnet-readonly.v1', mode: 'devnet', status: 'blocked',
    observedAt: new Date().toISOString(), sourceCommit: 'c294f8903f18efc746584e3cc2961d6033b8365c',
    rpc, config: DEVNET_CONFIG, rpcMethodsExecuted: [], observations: {}, blockers: [],
    walletKeyReads: 0, signaturesCreated: 0, simulations: 0, broadcasts: 0 };
  let requestId = 0;
  async function read(method, params = []) {
    if (!READ_METHODS.has(method)) throw new Error('non_read_rpc_forbidden');
    report.rpcMethodsExecuted.push(method);
    const response = await fetchImpl(rpc, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: ++requestId, method, params }), signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`rpc_http_${response.status}`);
    let bytes = 0; const parts = [];
    for await (const part of response.body) {
      bytes += part.length; if (bytes > 8 * 1024 * 1024) throw new Error('rpc_response_over_cap'); parts.push(Buffer.from(part));
    }
    const result = JSON.parse(Buffer.concat(parts).toString('utf8'));
    if (result.error) throw new Error(`rpc_error_${result.error.code}`);
    if (!Object.hasOwn(result, 'result')) throw new Error('rpc_result_missing');
    return result.result;
  }
  const account = address => read('getAccountInfo', [address, { commitment: 'finalized', encoding: 'base64' }]);
  try {
    report.observations.genesisHash = await read('getGenesisHash');
    validateDevnetConfig(DEVNET_CONFIG, { observedGenesisHash: report.observations.genesisHash });
    report.observations.finalizedSlot = await read('getSlot', [{ commitment: 'finalized' }]);
    const program = await account(DEVNET_CONFIG.program);
    const p = program.value;
    report.observations.program = { address: DEVNET_CONFIG.program, observedSlot: program.context.slot, exists: !!p,
      executable: p?.executable ?? false, loader: p?.owner ?? null };
    if (!p?.executable || p.owner !== 'BPFLoaderUpgradeab1e11111111111111111111111') {
      report.status = 'incompatible'; report.blockers.push('program_missing_or_unsupported_loader');
    } else {
      const data = Buffer.from(p.data[0], 'base64');
      if (data.length !== 36 || data.readUInt32LE(0) !== 2) throw new Error('program_loader_layout_unverified');
      const address = base58(data.subarray(4, 36));
      const programData = await account(address);
      const bytes = programData.value ? Buffer.from(programData.value.data[0], 'base64') : null;
      if (!bytes || bytes.length < 45 || bytes.readUInt32LE(0) !== 3 || programData.value.owner !== p.owner) throw new Error('program_data_layout_unverified');
      report.observations.programData = { address, observedSlot: programData.context.slot,
        deploymentSlot: bytes.readBigUInt64LE(4).toString(), dataSha256: digest(bytes),
        deploymentByteSha256: digest(bytes.subarray(45)), deploymentByteLength: bytes.length - 45 };
    }
    const mint = await account(DEVNET_CONFIG.mint);
    const bytes = mint.value ? Buffer.from(mint.value.data[0], 'base64') : null;
    const validMint = mint.value?.owner === DEVNET_CONFIG.tokenProgram && bytes?.length === 82 && bytes[45] === 1;
    report.observations.mint = { address: DEVNET_CONFIG.mint, observedSlot: mint.context.slot,
      owner: mint.value?.owner ?? null, decimals: validMint ? bytes[44] : null };
    if (!validMint || bytes[44] !== DEVNET_CONFIG.decimals) { report.status = 'incompatible'; report.blockers.push('mint_owner_or_decimals_mismatch'); }
    for (const [role, owner] of [['payer', payer], ['payee', payee]]) {
      if (!owner) { report.blockers.push(`${role}_public_identity_unavailable`); continue; }
      const accounts = await read('getTokenAccountsByOwner', [owner, { mint: DEVNET_CONFIG.mint }, { commitment: 'finalized', encoding: 'jsonParsed' }]);
      report.observations[role] = { publicAddress: owner, observedSlot: accounts.context.slot,
        tokenAccounts: accounts.value.map(record => ({ address: record.pubkey,
          tokenProgram: record.account.owner, owner: record.account.data.parsed.info.owner,
          mint: record.account.data.parsed.info.mint, amountBaseUnits: record.account.data.parsed.info.tokenAmount.amount })) };
      if (report.observations[role].tokenAccounts.some(a => a.tokenProgram !== DEVNET_CONFIG.tokenProgram || a.owner !== owner || a.mint !== DEVNET_CONFIG.mint)) {
        report.status = 'incompatible'; report.blockers.push(`${role}_account_mismatch`);
      }
    }
    report.blockers.push('deployed_abi_and_voucher_verifier_relationship_unverified',
      'deployed_treasury_and_canonical_ata_unverified', 'canonical_payer_payee_ata_derivation_not_executed',
      'open_settle_distribute_reclaim_simulations_not_run', 'sdk_artifact_unavailable');
  } catch (error) { report.blockers.push(error.message === 'terms_mismatch' ? 'network_genesis_mismatch' : `read_failed:${error.message}`); if (error.message === 'terms_mismatch') report.status = 'incompatible'; }
  return report;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2); const options = {};
  for (let index = 0; index < args.length; index += 2) {
    if (!['--rpc', '--payer', '--payee'].includes(args[index]) || !args[index + 1]) throw new Error('usage: --rpc approved-devnet-url --payer public-address --payee public-address');
    options[args[index].slice(2)] = args[index + 1];
  }
  const report = await checkDevnet(options);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = report.status === 'incompatible' ? 2 : 0;
}
