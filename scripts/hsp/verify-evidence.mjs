// Read-only verifier: no model calls, signing, order creation or broadcasts.
import {readFileSync} from 'node:fs';
import {validateEvidence} from '../../packages/hsp/evidence.mjs';
import {evmReaders,createRegistryClient} from '../../packages/hsp/evm.mjs';
import {check} from '../../packages/hsp/config.mjs';
const value=validateEvidence(JSON.parse(readFileSync(process.argv[2]??'artifacts/hsp/qa-evidence.json')));
check(value.execution==='actual-hsp-qa','hsp_fixture_is_not_network_evidence');const readers=await evmReaders({qaRpcURL:process.env.AXP_HSP_RPC_URL,mainnetRpcURL:process.env.AXP_HSP_MAINNET_RPC_URL});
for(const d of value.deliveries){check(d.stage==='finalized'&&!d.uncertain,'hsp_evidence_incomplete');await readers.verifyTransfer({token:value.token,payer:value.payer,payee:value.payee,txHash:d.transactionHash,principalRaw:d.amountMicroUsd,totalRaw:d.authorizationRaw});if(d.anchor?.verified){const registry=await createRegistryClient({address:d.anchor.registry,registrar:d.anchor.deployment?.registrar,main:readers.main,deployment:d.anchor.deployment});await registry.verify(d.anchor.transactionHash,{chargeId:d.chargeId,receiptHash:d.receiptHash,flowId:d.flowId,paymentRequestId:d.paymentRequestId,amountBaseUnits:d.amountMicroUsd,quote:{token_total_raw:d.authorizationRaw},txHash:d.transactionHash,transfer:d.transfer},{token:value.token,payer:value.payer,payee:value.payee});}else check(false,'hsp_anchor_missing');}
check(value.deliveries.length===3,'hsp_three_payments_not_complete');console.log(JSON.stringify({verified:true,payments:3,paymentChainId:133,anchors:3,registryChainId:177,contentHash:value.contentHash}));
